import { JSONSchema4, JSONSchema4TypeName } from 'json-schema';
import { castArray, forOwn, isArray, isObject, mapKeys, isEmpty, cloneDeep } from 'lodash';
import { compile, Options } from 'json-schema-to-typescript';
import { run } from 'json_typegen_wasm';
import * as changeCase from 'change-case';
import { yapiApiUrl, yapiDomain } from '../config';

/**
 * 将字符串转为大驼峰形式。
 * @param str 要转换的字符串
 * @returns 转换后的字符串
 */
export function toPascalCase(str: string) {
  const noCaseStr = changeCase.noCase(str);
  const capitalCaseStr = changeCase.capitalCase(noCaseStr, { delimiter: '' });
  return capitalCaseStr;
}

/**
 * 将路径统一为 unix 风格的路径。
 *
 * @param path 路径
 * @returns unix 风格的路径
 */
export function toUnixPath(path: string) {
  return path.replace(/[/\\]+/g, '/');
}

/**
 * 将 JSONSchema 字符串转为 JSONSchema 对象。
 *
 * @param str 要转换的 JSONSchema 字符串
 * @returns 转换后的 JSONSchema 对象
 */
export function jsonSchemaStringToJsonSchema(
  str: string,
  customTypeMapping: Record<string, JSONSchema4TypeName>
): JSONSchema4 {
  return processJsonSchema(JSON.parse(str), customTypeMapping);
}

/**
 * 原地遍历 JSONSchema。
 */
export function traverseJsonSchema(
  jsonSchema: JSONSchema4,
  cb: (jsonSchema: JSONSchema4, currentPath: Array<string | number>) => JSONSchema4,
  currentPath: Array<string | number> = []
): JSONSchema4 {
  /* istanbul ignore if */
  if (!isObject(jsonSchema)) return jsonSchema;

  // Mock.toJSONSchema 产生的 properties 为数组，然而 JSONSchema4 的 properties 为对象
  if (isArray(jsonSchema.properties)) {
    jsonSchema.properties = (jsonSchema.properties as JSONSchema4[]).reduce<Exclude<JSONSchema4['properties'], undefined | null>>(
      (props, js) => {
        props[js.name] = js;
        return props;
      },
      {}
    );
  }

  // 处理传入的 JSONSchema
  cb(jsonSchema, currentPath);

  // 继续处理对象的子元素
  if (jsonSchema.properties) {
    forOwn(jsonSchema.properties, (item, key) => traverseJsonSchema(item, cb, [...currentPath, key]));
  }

  // 继续处理数组的子元素
  if (jsonSchema.items) {
    castArray(jsonSchema.items).forEach((item, index) => traverseJsonSchema(item, cb, [...currentPath, index]));
  }

  // 处理 oneOf
  if (jsonSchema.oneOf) {
    jsonSchema.oneOf.forEach((item) => traverseJsonSchema(item, cb, currentPath));
  }

  // 处理 anyOf
  if (jsonSchema.anyOf) {
    jsonSchema.anyOf.forEach((item) => traverseJsonSchema(item, cb, currentPath));
  }

  // 处理 allOf
  if (jsonSchema.allOf) {
    jsonSchema.allOf.forEach((item) => traverseJsonSchema(item, cb, currentPath));
  }

  return jsonSchema;
}

/**
 * 原地处理 JSONSchema。
 *
 * @param jsonSchema 待处理的 JSONSchema
 * @returns 处理后的 JSONSchema
 */
export function processJsonSchema(
  jsonSchema: JSONSchema4,
  customTypeMapping: Record<string, JSONSchema4TypeName>
): JSONSchema4 {
  return traverseJsonSchema(jsonSchema, (jsonSchema) => {
    // 删除通过 swagger 导入时未剔除的 ref
    delete jsonSchema.$ref;
    delete jsonSchema.$$ref;

    // 数组只取第一个判断类型
    if (jsonSchema.type === 'array' && Array.isArray(jsonSchema.items) && jsonSchema.items.length) {
      jsonSchema.items = jsonSchema.items[0];
    }

    // 处理类型名称为标准的 JSONSchema 类型名称
    if (jsonSchema.type) {
      // 类型映射表，键都为小写
      const typeMapping: Record<string, JSONSchema4TypeName> = {
        byte: 'integer',
        short: 'integer',
        int: 'integer',
        long: 'integer',
        float: 'number',
        double: 'number',
        bigdecimal: 'number',
        char: 'string',
        void: 'null',
        ...mapKeys(customTypeMapping, (_, key) => key.toLowerCase()),
      };
      const isMultiple = Array.isArray(jsonSchema.type);
      const types = castArray(jsonSchema.type).map((type) => {
        // 所有类型转成小写，如：String -> string
        type = type.toLowerCase() as any;
        // 映射为标准的 JSONSchema 类型
        type = typeMapping[type] || type;
        return type;
      });
      jsonSchema.type = isMultiple ? types : types[0];
    }

    // 移除字段名称首尾空格
    if (jsonSchema.properties) {
      forOwn(jsonSchema.properties, (_, prop) => {
        const propDef = jsonSchema.properties![prop];
        delete jsonSchema.properties![prop];
        jsonSchema.properties![(prop as string).trim()] = propDef;
      });
      if (Array.isArray(jsonSchema.required)) {
        jsonSchema.required = jsonSchema.required.map((prop) => prop.trim());
      }
    }

    return jsonSchema;
  });
}

/**
 * 获取适用于 JSTT 的 JSONSchema。
 *
 * @param jsonSchema 待处理的 JSONSchema
 * @returns 适用于 JSTT 的 JSONSchema
 */
export function jsonSchemaToJSTTJsonSchema(jsonSchema: JSONSchema4, typeName: string): JSONSchema4 {
  if (jsonSchema) {
    // 去除最外层的 description 以防止 JSTT 提取它作为类型的注释
    delete jsonSchema.description;
  }
  return traverseJsonSchema(jsonSchema, (jsonSchema, currentPath) => {
    // 支持类型引用
    const refValue =
      // YApi 低版本不支持配置 title，可以在 description 里配置
      jsonSchema.title == null ? jsonSchema.description : jsonSchema.title;
    if (refValue?.startsWith('&')) {
      const typeRelativePath = refValue.substring(1);
      const typeAbsolutePath = toUnixPath(`/${currentPath.join('/')}`.replace(/\/{2,}/g, '/').replace(/^[a-z]+:/i, ''));
      const typeAbsolutePathArr = typeAbsolutePath.split('/').filter(Boolean);

      let tsTypeLeft = '';
      let tsTypeRight = typeName;
      for (const key of typeAbsolutePathArr) {
        tsTypeLeft += 'NonNullable<';
        tsTypeRight += `[${JSON.stringify(key)}]>`;
      }
      const tsType = `${tsTypeLeft}${tsTypeRight}`;

      jsonSchema.tsType = tsType;
    }

    // 去除 title 和 id，防止 json-schema-to-typescript 提取它们作为接口名
    delete jsonSchema.title;
    delete jsonSchema.id;

    // 忽略数组长度限制
    delete jsonSchema.minItems;
    delete jsonSchema.maxItems;

    if (jsonSchema.type === 'object') {
      // 将 additionalProperties 设为 false
      jsonSchema.additionalProperties = false;
    }

    // 删除 default，防止 json-schema-to-typescript 根据它推测类型
    delete jsonSchema.default;

    return jsonSchema;
  });
}

/**
 * 根据 JSONSchema 对象生产 TypeScript 类型定义。
 *
 * @param jsonSchema JSONSchema 对象
 * @param typeName 类型名称
 * @returns TypeScript 类型定义
 */
export async function jsonSchemaToType(jsonSchema: JSONSchema4, typeName: string): Promise<string> {
  if (isEmpty(jsonSchema)) {
    return `export interface ${typeName} {}`;
  }
  if (jsonSchema.__is_any__) {
    delete jsonSchema.__is_any__;
    return `export type ${typeName} = any`;
  }
  // JSTT 会转换 typeName，因此传入一个全大写的假 typeName，生成代码后再替换回真正的 typeName
  const fakeTypeName = 'THISISAFAKETYPENAME';
  const JSTTOptions: Partial<Options> = {
    bannerComment: '',
    declareExternallyReferenced: true,
    enableConstEnums: true,
    unreachableDefinitions: false,
    strictIndexSignatures: false,
    format: false,
  };
  const result = jsonSchemaToJSTTJsonSchema(cloneDeep(jsonSchema), typeName) || {};
  if (result) {
    const code = await compile(result, fakeTypeName, JSTTOptions);
    return code.replace(fakeTypeName, typeName).trim();
  }
  return '';
}

/**
 * 根据 JSONSchema 字符串生产 TypeScript 类型定义。
 * @deprecated 请使用 `jsonSchemaToType`, transformer不满足需求
 */
export const transformer = async ({ value }: any) => {
  return run(
    'Root',
    value,
    JSON.stringify({
      output_mode: true ? 'typescript/typealias' : 'typescript',
    })
  );
};

/**
 * 根据当前浏览器路径,请求参数
 */
export const getUrlParams = async ():Promise<any> => {
  const url = await getCurrentUrl();
  const urlArr = url.split('/');
  const id = urlArr[urlArr.length - 1];
  const urlWithParams = `${yapiApiUrl}?id=${encodeURIComponent(id)}`;
  const cookieString = await getCookie();
  return fetch(urlWithParams, {
    mode: 'no-cors',
    headers: {
      Cookie: cookieString,
    },
  })
  .then(response => response.json());
};

/**
 * 获取当前页面地址
 */
export const getCurrentUrl = () => {
  return new Promise<string>((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentUrl = tabs[0].url;
      console.log(new URL(currentUrl as string));
      resolve(currentUrl || '');
    });
  });
};

/**
 * 获取cookie
 */
export const getCookie = () => {
  return new Promise<string>((resolve, reject) => {
    chrome.cookies.getAll({ domain: yapiDomain}, function (cookies) {
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
      resolve(cookieString);
    });
  });
}

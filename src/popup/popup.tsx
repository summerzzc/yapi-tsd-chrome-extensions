import React, { useState } from 'react';
import './popup.css';

import { jsonSchemaStringToJsonSchema, transformer, jsonSchemaToType, toPascalCase, getUrlParams } from '../utils';

export default function Popup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [typeScriptDeclare, setTypeScriptDeclare] = useState('');

  /**
   * 通过jsonSchemaString生成TypeScript声明
   */
  const jsonSchemaStringToTypeScriptDeclare = (jsonSchemaString: string, typeName: string) => {
    // 如果有需要，可以在这里对jsonSchemaString进行处理,过滤一些不需要的内容
    const temporary = jsonSchemaString.replace(/注释\\n\\t/gim, '').replace(/<p>/gim, '');
    const result = jsonSchemaStringToJsonSchema(temporary, {});
    return jsonSchemaToType(result, typeName);
  }

  /**
   * 点击生成
   * @returns promise<void>
   */
  const handleGenerate = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    console.time('jsonSchemaStringToJsonSchema');
    const res = await getUrlParams();
    console.log(res);
    const { errcode, data, errmsg } = res;
    if (errcode !== 0) {
      setResult(errmsg || '请先登录');
      return;
    }
    const { req_body_other, path, res_body } = data;
    const typeName = toPascalCase(path);

    // 入参的类型声明
    const typeScriptDeclareParam = await jsonSchemaStringToTypeScriptDeclare(req_body_other, `${typeName}Param`);

    // 出参的类型声明
    const typeScriptDeclareRes = await jsonSchemaStringToTypeScriptDeclare(res_body, `${typeName}Res`);
    
    setTypeScriptDeclare(`${typeScriptDeclareParam}\n\n${typeScriptDeclareRes}`);
    console.timeEnd('jsonSchemaStringToJsonSchema');
    setLoading(false);
  };

  /**
   * 点击复制
   * @returns void
   */
  const handleCopy = () => {
    // 复制到剪切板
    navigator.clipboard.writeText(typeScriptDeclare).then(
      () => {
        console.log('复制成功');
        setResult('复制成功');
      },
      () => {
        console.log('复制失败');
        setResult('复制失败');
      }
    );
  };

  return (
    <div className="popupContainer">
      <h3>yapi转TypeScript声明</h3>
      <textarea value={typeScriptDeclare} readOnly></textarea>
      <span>{result}</span>
      <div>
        <button onClick={handleGenerate}>点击生成</button>
        <button onClick={handleCopy}>点击复制</button>
      </div>
    </div>
  );
}

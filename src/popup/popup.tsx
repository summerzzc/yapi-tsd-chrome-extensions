import React, { useState } from 'react';
import './popup.css';

import { jsonSchemaStringToJsonSchema, transformer, jsonSchemaToType, toPascalCase, getUrlParams } from '../utils';

export default function Popup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [typeScriptDeclare, setTypeScriptDeclare] = useState('');

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
    const { req_body_other, path } = data;
    const jsonSchemaString = req_body_other.replace(/注释\\n\\t/gim, '').replace(/<p>/gim, '');

    // 通过transformer转换,会忽略掉description,放弃使用
    // const b = await transformer({value:jsonSchemaString})

    const result = jsonSchemaStringToJsonSchema(jsonSchemaString, {});
    const typeName = toPascalCase(path);
    const typeScriptDeclare = await jsonSchemaToType(result, typeName);
    console.log(typeScriptDeclare);
    setTypeScriptDeclare(typeScriptDeclare);
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

import React, { useState } from 'react';
import './popup.css';

import { jsonSchemaStringToTypeScriptDeclare, transformer, toPascalCase, getUrlResult } from '../utils';

export default function Popup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [typeScriptDeclare, setTypeScriptDeclare] = useState('');

  /** 点击生成*/
  const handleGenerate = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    console.time('jsonSchemaStringToJsonSchema');
    // 获取数据
    const res = await getUrlResult();
    const { errcode, data, errmsg } = res;
    if (errcode !== 0) {
      setResult(errmsg || '请先登录');
      return;
    }
    const { req_body_other, path, res_body } = data;
    // 获取接口名称
    const typeName = toPascalCase(path);

    // 入参的类型声明
    const typeScriptDeclareParam = await jsonSchemaStringToTypeScriptDeclare(req_body_other, `${typeName}Param`);

    // 出参的类型声明
    const typeScriptDeclareRes = await jsonSchemaStringToTypeScriptDeclare(res_body, `${typeName}Res`);

    // 拼接出入参类型声明
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
        setResult('复制成功');
      },
      () => {
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

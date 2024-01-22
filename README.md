# yapi-tsd-chrome-extensions
yapi的ts声明谷歌插件

## 说明
- 本插件基于yapi的插件，方便生成单个接口的ts声明. 如果你需要的是整个项目的ts声明文件，可以使用[YApi to TypeScript](https://fjc0k.github.io/yapi-to-typescript/handbook/)
- 本项目使用[web-extension-template](https://github.com/fregante/browser-extension-template)模版生成

## 目录结构
```
├── dist/                     # 打包后的文件
├── src/                      # 源码
│   ├── config/               # 项目配置文件
│   ├── assets/               # 静态资源
│   ├── popup/                # 弹出页
│   ├── types/                # 类型声明
│   ├── utils/                # 工具函数
│   ├── manifest.json         # 谷歌配置文件
│   └── index.tsx             # 入口文件
...
```

## 安装
- 下载本项目
- 执行`npm install`
- 替换`src/config/index.ts`中的`yapiDomain`为你的yapi地址
- 执行`npm run build`(注意:虽然默认存在dist目录，但是需要执行一次build命令，生成新的js文件)
- 打开谷歌浏览器的扩展程序
- 打开开发者模式
- 加载已解压的扩展程序
- 选择本项目的dist目录

## 使用
- 打开yapi的接口详情页
- 点击插件图标
- 点击生成按钮
- 点击复制按钮
- 在你的ts文件中粘贴

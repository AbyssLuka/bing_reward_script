# 自动刷Bing积分的Nodejs脚本

## 安装依赖

```bash

npm install
```

## 查看帮助

```bash

npx tsx src/main.ts -h
```

## 刷PC端的积分

```bash

npm run pc-script
```

## 刷移动端积分

```bash

npm run mobile-script
```

## 远程连接浏览器

```bash

npx tsx src/main.ts --pc-script -s <selector> -c <ip:port>
```

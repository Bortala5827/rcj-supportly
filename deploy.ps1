# RCJ Supportly 一键部署脚本
# 使用方法: .\deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RCJ Supportly 客服系统一键部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 版本
Write-Host "[1/6] 检查 Node.js 版本..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "  当前版本: $nodeVersion" -ForegroundColor Green
if ($nodeVersion -lt "v22.0.0") {
    Write-Host "  ⚠️  Node.js 版本过低，需要 v22+，请使用 D:\node 或升级" -ForegroundColor Red
    $env:PATH = "D:\node;$env:PATH"
    $nodeVersion = node --version
    Write-Host "  已切换到: $nodeVersion" -ForegroundColor Green
}
Write-Host ""

# 安装依赖
Write-Host "[2/6] 安装依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install --legacy-peer-deps
    Write-Host "  ✅ 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "  ✅ 依赖已存在，跳过" -ForegroundColor Green
}
Write-Host ""

# 检查 wrangler 登录
Write-Host "[3/6] 检查 Cloudflare 登录状态..." -ForegroundColor Yellow
$whoami = npx wrangler whoami 2>&1
if ($whoami -match "Not authenticated") {
    Write-Host "  ⚠️  未登录，请运行: npx wrangler login" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ✅ 已登录 Cloudflare" -ForegroundColor Green
}
Write-Host ""

# 数据库迁移
Write-Host "[4/6] 执行数据库迁移..." -ForegroundColor Yellow
npx wrangler d1 migrations apply supportly --remote
Write-Host "  ✅ 数据库迁移完成" -ForegroundColor Green
Write-Host ""

# 部署
Write-Host "[5/6] 部署到 Cloudflare Workers..." -ForegroundColor Yellow
npx wrangler deploy
Write-Host "  ✅ 部署完成" -ForegroundColor Green
Write-Host ""

# 完成
Write-Host "[6/6] 部署完成！" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ 部署成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  API 地址: https://support.955827.xyz" -ForegroundColor White
Write-Host "  健康检查: https://support.955827.xyz/health" -ForegroundColor White
Write-Host "  管理后台: https://exam.955827.xyz/admin.html" -ForegroundColor White
Write-Host ""
Write-Host "  默认账号: admin@example.com / admin123" -ForegroundColor Yellow
Write-Host "  ⚠️  请尽快修改默认密码！" -ForegroundColor Red
Write-Host ""

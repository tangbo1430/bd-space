# 半打空间官网 本地/静态部署镜像
# 阶段 1：构建静态产物；阶段 2：nginx 托管
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# 站点绝对地址可在构建期覆盖：docker build --build-arg PUBLIC_SITE_URL=https://example.com
ARG PUBLIC_SITE_URL=http://localhost:4321
ENV PUBLIC_SITE_URL=${PUBLIC_SITE_URL}
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

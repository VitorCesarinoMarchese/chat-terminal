FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 8080 3030
CMD ["npm", "run", "dev"]

FROM base AS build
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.postgres.prisma
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.postgres.prisma
COPY --from=build /app/dist ./dist
EXPOSE 8080 3030
CMD ["npm", "run", "start"]


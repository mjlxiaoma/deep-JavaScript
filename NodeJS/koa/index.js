// // src/index.js

// const Koa = require("koa");
// const app = new Koa();
// // app.use(async (ctx) => {
// //   ctx.body = 'Hello World'
// // })
// app.use(async (ctx) => {
//   console.log(ctx,'ctx');

//   ctx.body = {
//     email: "1637560616@qq.com",
//     code: "815552",
//   };
// });

// app.listen(3000);
// const Koa = require("koa");
// const { koaBody } = require("koa-body");
// const app = new Koa();

// app.use(koaBody());
// app.use(async (ctx) => {
//   if (ctx.method === "POST") {
//     const { user, email } = ctx.request.body || {};
//     console.log("user and email ", user, email);

//     // 其他处理，如 await insertUserToDatabase(user, email)

//     ctx.body = {
//       status: "success",
//       user,
//       email,
//     };
//   }
// });

// app.listen(3000);

const Koa = require("koa");
const { koaBody } = require("koa-body");
const Router = require("@koa/router");

const app = new Koa();
const router = new Router();

app.use(koaBody());

router.post("/api/user", (ctx) => {
  const { user, email } = ctx.request.body || {};
  console.log("user and email ", user, email);

  // 其他处理，如 await insertUserToDatabase(user, email)

  ctx.body = {
    status: "success",
    user,
    email,
  };
});

// 继续扩展其他路由...

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);

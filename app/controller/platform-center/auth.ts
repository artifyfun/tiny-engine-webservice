/**
* Copyright (c) 2023 - present TinyEngine Authors.
* Copyright (c) 2023 - present Huawei Cloud Computing Technologies Co., Ltd.
*
* Use of this source code is governed by an MIT-style license.
*
* THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
* BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
* A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
*
*/
import { Controller } from 'egg';
// const fs = require('fs-extra')
// const path = require('path')

export default class AuthController extends Controller {

  async login() {
    const { body } = this.ctx.request;
    const { auth } = this.ctx.service;
    const data = await auth.login(body);
    this.ctx.body = data;
  }
  

  async register() {
    const { body } = this.ctx.request;
    const { auth } = this.ctx.service;
    const data = await auth.register(body);
    this.ctx.body = data;
  }
  

  async me() {
    // const user = fs.readFileSync(path.join(__dirname, './defaultUser.json'), 'utf8')
    const { auth } = this.ctx.service;
    const user = await auth.me();
    this.ctx.body = user;
  }

  async users() {
    const { auth } = this.ctx.service;
    const { query } = this.ctx.request;
    this.ctx.body = await auth.users(query);
  }

}

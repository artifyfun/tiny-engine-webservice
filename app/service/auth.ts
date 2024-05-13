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
import * as qs from 'qs';
import { I_Response } from '../lib/interface';
import { E_Method } from '../lib/enum';
import DataServcice, { SESSION_KEY } from './dataService';

class Auth extends DataServcice {
 
  // 查询用户列表
  users(param): Promise<I_Response> {
    const url = `users?${qs.stringify(param)}`;
    return this.query({
      url
    });
  }

  // 查询当前角色信息
  async me(): Promise<I_Response> {
    const userInfo = await this.query({
      url: `users/me`,
    });
    return this.ctx.helper.getUserInfo(userInfo);
  }

  async login(param): Promise<I_Response> {
    const userInfo = await this.query({
      url: `auth/local`,
      method: E_Method.Post,
      data: param
    }, false);
    if (userInfo.data?.jwt) {
      this.ctx.cookies.set(SESSION_KEY, userInfo.data.jwt, {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        overwrite: true,
      });
    }
    return this.ctx.helper.getUserInfo(userInfo);
  }

  async register(param): Promise<I_Response> {
    const userInfo = await this.query({
      url: `auth/local/register`,
      method: E_Method.Post,
      data: param
    }, false);
    return this.ctx.helper.getUserInfo(userInfo);
  }

}

export default Auth;

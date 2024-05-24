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

export default class HomeController extends Controller {
  public healthCheck() {
    const { ctx } = this;
    ctx.response.status = 200;
    ctx.body = 'success';
  }

  public async index() {
    await this.ctx.render('index');
  }

  public async canvas() {
    await this.ctx.render('canvas');
  }

  public async preview() {
    await this.ctx.render('preview');
  }

  public async previewApp() {
    await this.ctx.render('previewApp')
  }

  public async downloadApp() {
    await this.ctx.render('downloadApp')
  }

  public async artifyfun() {
    await this.ctx.render('artifyfun')
  }
  public async comfyui() {
    // await this.ctx.render('comfyui')
    const url = '127.0.0.1:8188'
    await this.ctx.proxyRequest(url, {
      rewrite(urlObj) {
        urlObj.pathname = urlObj.pathname.replace('/comfyui', '');
        return urlObj;
      },
      streaming: false,
      async beforeResponse(proxyResult) {
        if (proxyResult.res.requestUrls[0].endsWith('.js')) {
          return proxyResult;
        }
        proxyResult.data = Buffer.from(proxyResult.data.toString().replaceAll('./', '/comfyui/'))
        return proxyResult;
      },
    });
  }
}

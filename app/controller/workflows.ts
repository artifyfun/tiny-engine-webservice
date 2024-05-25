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
import { E_ErrorCode } from '../lib/enum';
import { ComfyUIClient } from '@artifyfun/comfy-ui-client';
import fs from 'fs-extra'
import path from 'path'

const defaultComfyuiUrl = new URL('http://127.0.0.1:8188')

function getQueueState(host, clientId) {
  const client = new ComfyUIClient(host, clientId);

  return client.getQueue();
}

const isValidParam = (id) => /^\d+$/.test(id);

/**
 * @controller WorkflowsController
 */
export default class WorkflowsController extends Controller {
  public async comfyui() {
    // await this.ctx.render('comfyui')
    const pathName = '/comfyui'
    const url = this.ctx.query.comfyui_url || defaultComfyuiUrl.origin
    const uri = new URL(url)
    if (this.ctx.request.url === '/comfyui/scripts/api.js') {
      const data = fs.readFileSync(path.join(__dirname, '../lib/comfyui-assets/api.js'), 'utf-8')
      this.ctx.set('Content-Type', 'application/javascript')
      this.ctx.body = data.replaceAll('comfyui-host', uri.host)
      return
    }
    await this.ctx.proxyRequest(uri.host, {
      rewrite(urlObj) {
        urlObj.pathname = urlObj.pathname.replace(pathName, '');
        return urlObj;
      },
      streaming: false,
      async beforeResponse(proxyResult) {
        const requestUrl = proxyResult.res.requestUrls[0];
        const isJsFile = requestUrl.endsWith('.js');
        if (isJsFile) {
          return proxyResult;
        }
        if (this.ctx.request.path === '/comfyui') {
          const data = proxyResult.data.toString().replaceAll('./', `${pathName}/`)
          this.ctx.set('Content-Type', 'text/html')
          return {
            ...proxyResult,
            data
          }
        }
        return proxyResult;
      },
    });
  }

  async find() {
    const queries = this.ctx.queries;
    this.ctx.body = await this.service.workflows.find(queries);
  }
  async view() {
    const querystring = this.ctx.querystring;
    const res = await this.service.workflows.view(querystring);
    this.ctx.body = res.res;
  }
  async create() {
    const payload = this.ctx.request.body;
    this.ctx.body = await this.service.workflows.create(payload);
  }
  async uploadImage() {
    const files = this.ctx.request.files
    const { key } = this.ctx.query
    this.ctx.body = await this.service.workflows.uploadImage(key, files[0]);
    this.ctx.cleanupRequestFiles();
  }
  async queue() {
    const payload = this.ctx.request.body;
    this.ctx.body = await this.service.workflows.queue(payload);
  }
  async deleteQueue() {
    const payload = this.ctx.request.body;
    this.ctx.body = await this.service.workflows.deleteQueue(payload);
  }
  async update() {
    const { id } = this.ctx.params;
    if (!isValidParam(id)) {
      this.ctx.body = this.getBadRequestResponse('id should be integer');
      return;
    }
    const payload = this.ctx.request.body;
    this.ctx.body = await this.service.workflows.update({ ...payload, id });
  }
  async delete() {
    const { id } = this.ctx.params;
    if (!isValidParam(id)) {
      this.ctx.body = this.getBadRequestResponse('id should be integer');
      return;
    }
    this.ctx.body = await this.service.workflows.delete(id);
  }
  getBadRequestResponse(message) {
    const error = {
      code: E_ErrorCode.BadRequest,
      message
    };
    return this.ctx.helper.getResponseData(null, error);
  }
  async state() {
    const { ctx } = this;
    if (!ctx.websocket) {
      throw new Error('this function can only be use in websocket router');
    }

    const emitError = (message) => {
      this.app.ws.sendJsonTo('workflows', {
        clientId: ctx.websocket?.protocol,
        type: 'error',
        data: {
          workflowKey: ctx.query.key,
          message
        }
      })
    }

    let comfyui_url = ''

    try {
      const res = await this.service.workflows.find({ key: ctx.query.key });
      const workflow = res.data?.[0]
      if (!workflow) {
        const message = `工作流不存在: ${ctx.query.key}`
        emitError(message)
        return
      }
      comfyui_url = workflow.comfyui_url || defaultComfyuiUrl.origin
    } catch (e: any) {
      const message = `工作流读取失败: ${(e as Error).message}`
      emitError(message)
      return
    }
    
    console.log(`client connected: ${ctx.websocket.protocol}`);

    ctx.websocket.room.join('workflows', ({ message }) => {
      const data = JSON.parse(message.toString());
      if (data?.clientId && data.clientId !== ctx.websocket?.protocol) {
        return;
      }
      
      ctx.websocket?.send(message);
    });

    ctx.websocket.send(JSON.stringify({
      type: "connect",
      data: true
    }));

    const host = new URL(comfyui_url).host

    // 发送当前队列状态
    getQueueState(host, ctx.websocket.protocol).then((state) => {
      ctx.websocket?.room.sendJsonTo('workflows', {
        type: 'state',
        data: {
          pending: state.queue_pending.length,
          running: state.queue_running.length,
        }
      });
    })

    // 发送历史数据
    const history = await ctx.service.cache.cache.get(`workflows/history/${ctx.websocket.protocol}`) || null;
    ctx.websocket.send(JSON.stringify({
      type: 'history',
      data: history
    }));

    ctx.websocket
      .on('message', (msg) => {
        console.log('receive', msg);
        // 心跳检测
        if (msg === 'ping') {
          ctx.websocket?.send(JSON.stringify({
            type: 'pong',
            data: 'pong'
          }));
        }
      })
      .on('close', (code, reason) => {
        console.log('websocket closed', code, reason);
      });
  }
}

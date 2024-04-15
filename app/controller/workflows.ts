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

const comfyuiHost = '127.0.0.1:8188'

function getQueueState(clientId) {
  const client = new ComfyUIClient(comfyuiHost, clientId);

  return client.getQueue();
}

const isValidParam = (id) => /^\d+$/.test(id);

/**
 * @controller WorkflowsController
 */
export default class WorkflowsController extends Controller {
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
    this.ctx.body = await this.service.workflows.uploadImage(files);
  }
  async queue() {
    const payload = this.ctx.request.body;
    this.ctx.body = await this.service.workflows.queue(payload);
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

    // 发送当前队列状态
    getQueueState(ctx.websocket.protocol).then((state) => {
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

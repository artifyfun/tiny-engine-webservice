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
  state() {
    const { ctx, app } = this;
    const nsp: any = app.io.of('/');
    const message = ctx.args[0] || {};
    const socket = ctx.socket;
    const client = socket.id;

    try {
      const { target, payload } = message;
      if (!target) return;
      const msg = ctx.helper.parseMsg('state', payload, { client, target });
      nsp.emit(target, msg);
    } catch (error) {
      app.logger.error(error);
    }
  }
}

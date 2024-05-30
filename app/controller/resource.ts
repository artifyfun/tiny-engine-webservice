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
 * @controller ResourceController
 */
export default class ResourceController extends Controller {
  async upload() {
    const files = this.ctx.request.files
    const { id } = this.ctx.params;
    if (!id) {
      this.ctx.body = this.getBadRequestResponse('appId is required');
      return;
    }
    this.ctx.body = await this.service.resource.upload(id, files[0]);
    this.ctx.cleanupRequestFiles();
  }
  async delete() {
    const { id } = this.ctx.params;
    if (!isValidParam(id)) {
      this.ctx.body = this.getBadRequestResponse('id should be integer');
      return;
    }

    this.ctx.body = await this.service.resource.delete(id);
  }
  getBadRequestResponse(message) {
    const error = {
      code: E_ErrorCode.BadRequest,
      message
    };
    return this.ctx.helper.getResponseData(null, error);
  }
}

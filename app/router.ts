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
import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;
  //健康检查
  router.get('/healthCheck', controller.home.healthCheck);

  router.get('/', controller.home.artifyfun);
  router.get('/design', controller.home.index);
  router.get('/design/canvas', controller.home.canvas);
  router.get('/design/preview', controller.home.preview);
  router.get('/design/previewApp', controller.home.previewApp);
  router.get('/design/downloadApp', controller.home.downloadApp);
  router.get('/artifyfun', controller.home.artifyfun);
  router.get('/artifyfun/*', controller.home.artifyfun);
  router.get('/comfyui', controller.home.comfyui);

  app.ws.route('/workflows', app.controller.workflows.state);
};

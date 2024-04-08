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
  const { controller, router, io } = app;
  //健康检查
  router.get('/healthCheck', controller.home.healthCheck);

  router.get('/entry', controller.home.index);
  router.get('/entry/canvas', controller.home.canvas);
  router.get('/entry/preview', controller.home.preview);
  router.get('/entry/previewApp', controller.home.previewApp);
  router.get('/artifyfun', controller.home.artifyfun);

  io.of('/').route('workflows', io.controller.workflows.state);
};

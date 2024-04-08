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
  const {
    controller,
    router,
    io
  } = app;

  const ROUTER_PREFIX = '/workflows/api';
  const subRouter = router.namespace(ROUTER_PREFIX);

  // workflows
  subRouter.get('/', controller.workflows.find);
  subRouter.get('/view', controller.workflows.view);
  subRouter.post('/create', controller.workflows.create);
  subRouter.post('/update/:id', controller.workflows.update);
  subRouter.post('/queue', controller.workflows.queue);
  subRouter.post('/upload/image', controller.workflows.uploadImage);
  subRouter.get('/delete/:id', controller.workflows.delete);
  io.of('/workflows').route('state', controller.workflows.state);

};

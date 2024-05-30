
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
import { Service } from 'egg';
import fs from 'fs-extra'

export default class ResourceService extends Service {
  async upload(id, file) {
    const fileSubfix = file.filename.split('.').pop()
    const fileName = `${new Date().getTime()}.${fileSubfix}`;
    const savePath = `./app/public/apps/${id}/${fileName}`;

    fs.cpSync(file.filepath, savePath, { recursive: true });
    
    const assetsUrl = `/apps/${id}/${fileName}`;

    return {
      url: assetsUrl,
      name: file.filename,
    };
  }

  async delete(id) {
    try {
      fs.rmSync(`./app/public/apps/${id}`, { recursive: true });
    }
    finally {
      return true;
    }
  }
}

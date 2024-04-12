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
import * as qs from 'querystring';
import { E_Method } from '../lib/enum';
import { I_CreateWorkflow, I_Response, I_UpdateWorkflow } from '../lib/interface';
import DataService from './dataService';
import merge from 'deepmerge-json';
import { v4 as uuidv4 } from 'uuid';

import { ComfyUIClient } from '@artifyfun/comfy-ui-client';
import type { Prompt, PromptHistory } from '@artifyfun/comfy-ui-client';

const comfyuiHost = '127.0.0.1:8188'

const uploadImage = (
  image: Buffer,
  filename: string,
  overwrite?: boolean,
) => {
  // Create client ID
  const clientId = uuidv4();

  // Create client
  const client = new ComfyUIClient(comfyuiHost, clientId);

  return client.uploadImage(
    image,
    filename,
    overwrite
  );
}

const getOutputs = (
  clientId,
  prompt: Prompt,
  eventEmitter?: (type: string, data: any) => void
): Promise<PromptHistory> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create client
      const client = new ComfyUIClient(comfyuiHost, clientId, eventEmitter);

      // Connect to server
      await client.connect();

      // Get result
      const result = await client.getResult(prompt);

      resolve(result);

      // Disconnect
      await client.disconnect();
    }
    catch (error) {
      reject(error);
    }
  });
};

function getSeed(n) {
  let num = "";
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      num += Math.floor(Math.random() * 9 + 1);
    } else {
      num += Math.floor(Math.random() * 10);
    }
  }
  return Number(num);
}

class Workflows extends DataService {
  getWorkflowById(id: number | string) {
    return this.query({
      url: `workflows/${id}`
    });
  }

  delete(id: number | string) {
    return this.query({
      url: `workflows/${id}`,
      method: E_Method.Delete
    });
  }

  create(param: I_CreateWorkflow) {
    return this.query({
      url: 'workflows',
      method: E_Method.Post,
      data: param
    });
  }

  update(param: I_UpdateWorkflow): Promise<I_Response> {
    return this.query({
      url: `workflows/${param.id}`,
      method: E_Method.Put,
      data: param
    });
  }

  find(param) {
    const query = typeof param === 'string' ? param : qs.stringify(param);
    return this.query({ url: `workflows?${query}` });
  }

  async view(querystring) {
    return this.ctx.curl(`${comfyuiHost}/view?${querystring}`, {
      streaming: true
    })
  }

  uploadImage(param) {
    return uploadImage(param.image, param.filename, param.overwrite)
  }

  async queue(param) {
    const { key, clientId } = param

    let workflow: any = null
    try {
      const res = await this.find({key})
      workflow = res.data?.[0]
    } catch (e: any) {
      throw new Error(`工作流读取失败: ${(e as Error).message}`);
    }
    if (!workflow) {
      throw new Error(`工作流不存在: ${key}`);
    }
    let response: any = null;
    try {
      if (workflow.workflowType === 'comfyui') {
        const fullPrompt = JSON.parse(JSON.stringify(workflow.prompt.output))
        const prompt = merge(fullPrompt, param.prompt)

        Object.keys(workflow.prompt.output).forEach(key => {
          const item = workflow.prompt.output[key]
          const target = prompt[key]
          if (typeof item.inputs?.seed === 'number' && typeof param.prompt[key]?.inputs?.seed !== 'number') {
            target.inputs.seed = getSeed(15)
          }
        })

        const eventEmitter = (type, data) => {
          this.app.ws.sendJsonTo('workflows', {
            clientId,
            workflowKey: key,
            type,
            data
          })
        }

        const { outputs } = await getOutputs(clientId, prompt, eventEmitter)
        const { paramsNodes } = workflow
        const outputKeys = paramsNodes.filter(item => item.category === 'output').map(item => item.id.toString())
        response = {}
        Object.keys(outputs).forEach(key => {
          if (outputKeys.includes(key)) {
            const imageUrls = outputs[key]?.images.filter(item => item.type === 'output').map(item => `/workflows/api/view?filename=${item.filename}&type=output`) || []
            response[key] = imageUrls.length ? imageUrls[imageUrls.length - 1] : outputs[key]
          }
        })
      }
      else {
        throw new Error(`工作流类型暂不支持: ${workflow.workflowType}`);
      }
    } catch (e: any) {
      throw new Error(`工作流执行失败: ${(e as Error).message}`);
    }

    if (!response) {
      throw new Error('工作流执行失败: 返回空数据');
    }
    return this.ctx.helper.getResponseData(response)
  }

}

export default Workflows;

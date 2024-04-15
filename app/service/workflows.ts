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

import { ComfyUIClient } from '@artifyfun/comfy-ui-client';
import type { Prompt, PromptHistory } from '@artifyfun/comfy-ui-client';

const comfyuiHost = '127.0.0.1:8188'

const uploadImage = (
  image: Buffer,
  filename: string,
  clientId: string,
  overwrite?: boolean,
) => {
  // Create client
  const client = new ComfyUIClient(comfyuiHost, clientId);

  return client.uploadImage(
    image,
    filename,
    overwrite
  );
}

function getQueueState(clientId) {
  const client = new ComfyUIClient(comfyuiHost, clientId);

  return client.getQueue();
}

function deleteQueue(clientId, promptId) {
  const client = new ComfyUIClient(comfyuiHost, clientId);

  return client.deleteQueue(promptId);
}

function interrupt(clientId) {
  const client = new ComfyUIClient(comfyuiHost, clientId);

  return client.interrupt();
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

let currentPromptId = null

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
    return uploadImage(param.image, param.filename, param.clientId, param.overwrite)
  }

  async queue(param) {
    const { key, clientId } = param

    this.app.ws.sendJsonTo('workflows', {
      clientId,
      type: 'running',
      data: {
        workflowKey: key,
      }
    })

    const emitError = (message) => {
      this.app.ws.sendJsonTo('workflows', {
        clientId,
        type: 'error',
        data: {
          workflowKey: key,
          message
        }
      })
    }

    const emitState = () => {
      getQueueState(clientId).then((state) => {
        this.app.ws.sendJsonTo('workflows', {
          type: 'state',
          data: {
            pending: state.queue_pending.length,
            running: state.queue_running.length,
          }
        })
      })
    }

    let workflow: any = null
    try {
      const res = await this.find({ key })
      workflow = res.data?.[0]
    } catch (e: any) {
      const message = `工作流读取失败: ${(e as Error).message}`
      emitError(message)
      throw new Error(message);
    }
    if (!workflow) {
      const message = `工作流不存在: ${key}`
      emitError(message)
      throw new Error(message);
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

        const nodes = Object.keys(prompt)
        const finishedNodes: any = []
        let progress = 0

        const eventEmitter = (type, data) => {
          if (type === 'message') {
            const message = JSON.parse(data.toString())
            if (message.type === 'execution_start') {
              progress = 1
              currentPromptId = message.data.prompt_id
            }
            if (message.type === 'execution_cached') {
              progress = Math.floor(message.data.nodes.length / nodes.length * 100)
              finishedNodes.push(...message.data.nodes)
            }
            if (message.type === "executing") {
              if (message.data.node === null) {
                currentPromptId = null
                progress = 100
              }
              else {
                if (!finishedNodes.includes(message.data.node)) {
                  finishedNodes.push(message.data.node)
                  progress = Math.floor(finishedNodes.length / nodes.length * 100)
                }
              }
            }
            if (message.type === "progress") {
              const step = message.data.value / message.data.max * 100 * 1 / nodes.length / message.data.max
              progress += step
            }
            this.app.ws.sendJsonTo('workflows', {
              type: 'progress',
              clientId,
              data: {
                workflowKey: key,
                promptId: currentPromptId,
                value: progress
              }
            })
          }
          else if (type === 'error') {
            emitError(data)
          }
        }

        setTimeout(() => {
          emitState()
        }, 1000)

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
        const message = `工作流类型暂不支持: ${workflow.workflowType}`
        emitError(message)
        throw new Error(message);
      }
    } catch (e: any) {
      const message = `工作流执行失败: ${(e as Error).message}`
      emitError(message)
      throw new Error(message);
    }

    emitState()

    if (!response) {
      const message = '工作流执行失败: 未获取到输出数据'
      emitError(message)
      throw new Error(message);
    }
    // 缓存历史数据
    const history = this.ctx.service.cache.cache.get(`workflows/history/${clientId}`) || {};
    history[key] = {
      prompt: param.prompt,
      outputs: response
    }
    this.ctx.service.cache.set(`workflows/history/${clientId}`, history, 60 * 60 * 24 * 1);

    this.app.ws.sendJsonTo('workflows', {
      clientId,
      type: 'done',
      data: {
        workflowKey: key,
        prompt: param.prompt,
        outputs: response
      }
    })

    return this.ctx.helper.getResponseData(response)
  }

  async deleteQueue(param) {
    const { clientId, promptId } = param
    let response
    if (promptId === currentPromptId) {
      response = await interrupt(clientId);
    } else {
      response = await deleteQueue(clientId, promptId);
    }

    return this.ctx.helper.getResponseData(response)
  }

}

export default Workflows;

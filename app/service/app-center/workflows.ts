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
import { E_Method } from '../../lib/enum';
import { I_CreateWorkflow, I_Response, I_UpdateWorkflow } from '../../lib/interface';
import DataService from '../dataService';
import merge from 'deepmerge-json';

const comfyuiHost = 'http://localhost:8188'

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

const workflowApis = {
  comfyui: {
    queue: function(param, workflow) {
      const { ctx } = this as any
      const {
        prompt
      } = param
      
      const fullPrompt = JSON.parse(JSON.stringify(workflow.prompt.output))
      const result = merge(fullPrompt, prompt)

      Object.keys(workflow.prompt.output).forEach(key => {
        const item = workflow.prompt.output[key]
        const target = result[key]
        if (typeof item.inputs?.seed === 'number' && typeof prompt[key]?.inputs?.seed !== 'number') {
          target.inputs.seed = getSeed(15)
        }
      })
      return ctx.curl(`${comfyuiHost}/prompt`, {
        method: E_Method.Post,
        dataType: 'json',
        data: JSON.stringify({
          prompt: result
        })
      })
    },
    loopState: function(param, prompt_id) {
      const { ctx } = this as any
      const {
      } = param

      function getHistory() {
        return new Promise((resolve, reject) => {
          ctx.curl(`${comfyuiHost}/history/${prompt_id}`, {
            method: E_Method.Get,
            dataType: 'json',
          })
            .then((res) => {
              resolve(res.data[prompt_id]);
            })
            .catch((error) => {
              reject(error);
            });
        });
      }

      function sleep(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
      }

      return new Promise(async (resolve, reject) => {
        for (let i = 0; i < 300; i++) {
          const history: any = await getHistory();
          if (history?.outputs) {
            resolve(history.outputs);
            break;
          }
          await sleep(1000);
        }
        reject();
      });

    },
    view: function(param) {
      const { ctx } = this as any
      const {
        filename
      } = param

      return ctx.curl(`${comfyuiHost}/view?filename=${filename}&type=output`, {
        streaming: true
      })

    },
    uploadImage: function(files) {
      const { ctx } = this as any
      
      return ctx.curl(`${comfyuiHost}/upload/image`, {
        type: E_Method.Post,
        files
      })

    },
  }
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

  view(param) {
    return workflowApis.comfyui.view.call(this, param)
  }

  uploadImage(param) {
    return workflowApis.comfyui.uploadImage.call(this, param)
  }

  async queue(param) {
    const { key } = param

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
      const res = await workflowApis[workflow.workflowType].queue.call(this, param, workflow)
      const outputs = await workflowApis[workflow.workflowType].loopState.call(this, param, res.data.prompt_id)
      const { paramsNodes } = workflow
      const outputKeys = paramsNodes.filter(item => item.category === 'output').map(item => item.id.toString())
      response = {}
      Object.keys(outputs).forEach(key => {
        if (outputKeys.includes(key)) {
          const imageUrls = outputs[key]?.images.filter(item => item.type === 'output').map(item => `/app-center/api/workflows/view?filename=${item.filename}&type=output`) || []
          response[key] = imageUrls.length ? imageUrls[imageUrls.length - 1] : outputs[key]
        }
      })
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

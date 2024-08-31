import { queryModels, queryModelProperties } from "@/service/model"

export const extractBusinessModelInfo = async () => {
  try {
    const models = await queryModels({})
    const modelInfo: any = []

    for (const model of models.data) {
      const properties = await queryModelProperties(model.id)
      modelInfo.push({
        appId: model.appId,
        modelName: model.name,
        namespace: model.namespace,
        modelPluralCode: model.modelPluralCode,
        singularCode: model.singularCode,
        tableName: model.tableName,
        description: model.description,
        modelId: model.id,
        properties: properties.data.map((property) => ({
          propId: property.id,
          name: property.name,
          code: property.code,
          type: property.type,
          uiType: property.uiType,
          columnName: property.columnName,
          required: property.required,
        })),
      })
    }

    return modelInfo
  } catch (error) {
    console.error("Error extracting business model info:", error)
    throw error
  }
}

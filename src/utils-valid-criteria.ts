import Ajv from 'ajv'

const schemaFilter = {
    type: 'object',
    properties: {
        name: { type: 'string', },
        description: { type: 'string', },
        reward: { type: 'string' },
        criteria: { type: 'object', },
    },
    required: ['name', 'description', 'reward', 'criteria',],
}

const schemaReward = {
    type: 'object',
    properties: {
        name: { type: 'string', },
        description: { type: 'string', },
        destination: { type: 'string' },
        token_id: { type: 'string' },
        criteria: { type: 'object', },
    },
    required: ['name', 'description', 'destination', 'token_id', 'criteria',],
}

export const validateFilters = (schemaType: 'filter' | 'reward', filters: Object): { err: string, isValid: boolean } => {
    const schema = schemaType == 'filter' ? schemaFilter : schemaReward
    const ajv = new Ajv()
    const validate = ajv.compile(schema)

    const isValid = validate(filters)
    if (!isValid) {
        // for (const err of validate.errors) {
        //     console.log(err)
        // }
        return { err: JSON.stringify(validate.errors.map(e => e.message)), isValid: false }
    }
    return { err: null, isValid: true }
}


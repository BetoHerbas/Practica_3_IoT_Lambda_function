const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
const IotData = new AWS.IotData({ endpoint: 'a3lhpt6z01b2r3-ats.iot.us-east-2.amazonaws.com' });

// Función para obtener el shadow de un dispositivo de forma dinámica
function getShadowPromise(thingName) {
    return new Promise((resolve, reject) => {
        IotData.getThingShadow({ thingName }, (err, data) => {
            if (err) {
                console.log(err, err.stack);
                reject(`Failed to get thing shadow ${err.message}`);
            } else {
                resolve(JSON.parse(data.payload));
            }
        });
    });
}

// Función para actualizar el shadow de un dispositivo de forma dinámica
function updateShadowPromise(thingName, payload) {
    return new Promise((resolve, reject) => {
        IotData.updateThingShadow({ thingName, payload }, (err, data) => {
            if (err) {
                console.log("Error al actualizar el shadow:", err);
                reject(err);
            } else {
                console.log("Solicitud de actualización enviada:", data);
                resolve(data);
            }
        });
    });
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Bienvenido a tu banda inteligente, tienes las opciones de consultar tu ritmo cardiaco y modificar los valores minimo y máximo en los que quieres recibir una notificación. ¿Qué deseas hacer?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Handler para consultar el pulso de un dispositivo específico
const CheckHeartbeatIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
               Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckHeartbeatIntent';
    },
    async handle(handlerInput) {
        const thingName = handlerInput.requestEnvelope.request.intent.slots.thingName.value;
        
        const updatePulseRequestParams = {
            state: {
                desired: {
                    pulse_requested: 1
                }
            }
        };

        await updateShadowPromise(thingName, JSON.stringify(updatePulseRequestParams));
        await new Promise(resolve => setTimeout(resolve, 3000));

        let pulse = 0;
        await getShadowPromise(thingName).then((result) => {
            pulse = result.state.reported.heart_rate;
        });

        const speakOutput = pulse > 0 ? `El pulso de ${thingName} es de ${pulse} latidos por minuto.` : 'No se pudo consultar el pulso. Intenta nuevamente.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Handler para consultar calorías de un dispositivo específico
const CheckCaloriesIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
               Alexa.getIntentName(handlerInput.requestEnvelope) === 'CheckCaloriesIntent';
    },
    async handle(handlerInput) {
        const thingName = handlerInput.requestEnvelope.request.intent.slots.thingName.value;

        let calories = 0;
        await getShadowPromise(thingName).then((result) => {
            calories = result.state.reported.calories;
        });

        const speakOutput = calories > 0 ? `Has quemado ${calories} calorías en ${thingName}.` : 'No se pudo consultar las calorías quemadas. Intenta nuevamente.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Handler para cambiar el valor máximo de pulsaciones
const ChangeMaxHeartbeatIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
               Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChangeMaxHeartbeatIntent';
    },
    async handle(handlerInput) {
        const thingName = handlerInput.requestEnvelope.request.intent.slots.thingName.value;
        const maxPulseValue = handlerInput.requestEnvelope.request.intent.slots.maxPulseValue.value;

        if (!thingName || !maxPulseValue) {
            const speakOutput = "Por favor, especifica el nombre del dispositivo y el valor de pulsaciones máximo.";
            return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
        }

        const updateMaxPulseParams = {
            state: {
                desired: {
                    max_pulse_alert: parseInt(maxPulseValue, 10)
                }
            }
        };

        await updateShadowPromise(thingName, JSON.stringify(updateMaxPulseParams));
        const speakOutput = `He configurado el valor máximo de pulsaciones en ${maxPulseValue} latidos por minuto para ${thingName}.`;

        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
};

// Handler para cambiar el valor mínimo de pulsaciones
const ChangeMinHeartbeatIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
               Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChangeMinHeartbeatIntent';
    },
    async handle(handlerInput) {
        const thingName = handlerInput.requestEnvelope.request.intent.slots.thingName.value;
        const minPulseValue = handlerInput.requestEnvelope.request.intent.slots.minPulseValue.value;

        if (!thingName || !minPulseValue) {
            const speakOutput = "Por favor, especifica el nombre del dispositivo y el valor de pulsaciones mínimo.";
            return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
        }

        const updateMinPulseParams = {
            state: {
                desired: {
                    min_pulse_alert: parseInt(minPulseValue, 10)
                }
            }
        };

        await updateShadowPromise(thingName, JSON.stringify(updateMinPulseParams));
        const speakOutput = `He configurado el valor mínimo de pulsaciones en ${minPulseValue} latidos por minuto para ${thingName}.`;

        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
               Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Puedes consultar el pulso y las calorías quemadas de diferentes dispositivos especificando su nombre.';

        return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CheckHeartbeatIntentHandler,
        CheckCaloriesIntentHandler,
        ChangeMaxHeartbeatIntentHandler,
        ChangeMinHeartbeatIntentHandler,
        HelpIntentHandler
    )
    .addErrorHandlers({
        canHandle: () => true,
        handle(handlerInput, error) {
            console.log(`Error handled: ${error}`);
            const speakOutput = 'Hubo un error. Intenta de nuevo.';
            return handlerInput.responseBuilder.speak(speakOutput).reprompt(speakOutput).getResponse();
        }
    })
    .lambda();

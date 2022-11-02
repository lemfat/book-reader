export const config = {
  inputStream: {
    name: "Live",
    type: "LiveStream",
    target: document.querySelector("#camera-area"),
    constraints: {
      decodeBarCodeRate: 3,
      successTimeout: 500,
      codeRepetition: true,
      tryVertical: true,
      frameRate: 1,
      facingMode: "environment"
    },
    area: {
      top: "20%",
      right: "0%",
      left: "0%",
      bottom: "20%"
    },
    singleChannel: false
  },
  decoder: {
    readers: [{
      format: "ean_reader",
      config: {}
    }]
  },
  numOfWorker: navigator.hardwareConcurrency || 4,
  frequency: 1,
  locate: false,
  src: null
};
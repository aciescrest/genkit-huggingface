![Firebase Genkit Community Plugin](https://firebasestorage.googleapis.com/v0/b/vorel-76eee.appspot.com/o/default-monochrome2.png?alt=media&token=ee093fb7-4974-4f8f-a1f5-53103ec1702b?raw=true)

<h4 align="center">Community Plugin for Google Firebase Genkit</h4>


</br>

Built by [**Acies Crest**](https://aciescrest.com) ❤️ 

# Hugging Face Genkit Plugin

This plugin integrates Hugging Face's Inference API into Genkit, allowing you to leverage Hugging Face models within the Genkit ecosystem.

## Installation

To install the library, use npm:

```bash
npm install genkit-huggingface
```

## Usage

Here is a simple example of how to use the `genkit-huggingface` library in your project:

```javascript
import { genkit } from 'genkit';
import { huggingface } from 'genkit-huggingface';

const ai = genkit({
  plugins: [
    huggingface({
      apiKey: process.env.HUGGING_FACE_API_KEY,
      defaultModel: 'Qwen/Qwen2.5-Coder-32B-Instruct' // Or any other Hugging Face model name
    })
  ]
});

// Use the model
const response = await ai.generate({ model: 'huggingface-model', prompt: "Hello, how are you?" });
console.log(response);
```

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Contact

For any questions or issues, please open an issue on this repository.

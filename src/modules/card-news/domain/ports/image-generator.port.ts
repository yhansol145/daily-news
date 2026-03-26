export interface ImageGeneratorPort {
  generate(prompt: string): Promise<string>;
}

export const IMAGE_GENERATOR_PORT = Symbol('IMAGE_GENERATOR_PORT');

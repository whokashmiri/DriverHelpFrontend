import * as ImageManipulator from "expo-image-manipulator";

export type OrderImageType =
  | "pickup"
  | "delivery"
  | "cancellation";

const IMAGE_CONFIG: Record<
  OrderImageType,
  {
    maxWidth: number;
    quality: number;
  }
> = {
  pickup: {
    maxWidth: 1800,
    quality: 0.82,
  },

  delivery: {
    maxWidth: 1800,
    quality: 0.82,
  },

  cancellation: {
    maxWidth: 1600,
    quality: 0.75,
  },
};

export async function compressOrderImage(
  uri: string,
  type: OrderImageType,
) {
  if (
    !uri ||
    uri.startsWith("http://") ||
    uri.startsWith("https://")
  ) {
    return uri;
  }

  const config = IMAGE_CONFIG[type];

  const result =
    await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: config.maxWidth,
          },
        },
      ],
      {
        compress: config.quality,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

  return result.uri;
}

export async function compressOrderImages(
  uris: string[],
  type: OrderImageType,
) {
  const results: string[] = [];

  const CONCURRENCY = 2;

  for (
    let index = 0;
    index < uris.length;
    index += CONCURRENCY
  ) {
    const batch =
      uris.slice(
        index,
        index + CONCURRENCY,
      );

    const compressed =
      await Promise.all(
        batch.map((uri) =>
          compressOrderImage(
            uri,
            type,
          ),
        ),
      );

    results.push(
      ...compressed,
    );
  }

  return results;
}
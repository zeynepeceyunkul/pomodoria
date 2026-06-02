import * as ImageManipulator from 'expo-image-manipulator';

const MAX_EDGE = 256;
const MAX_DATA_URI_LENGTH = 280_000;

export async function compressAvatarUri(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_EDGE, height: MAX_EDGE } }],
    {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error('Could not process the photo.');
  }

  const dataUri = `data:image/jpeg;base64,${result.base64}`;
  if (dataUri.length > MAX_DATA_URI_LENGTH) {
    throw new Error('Photo is still too large. Try a different image.');
  }
  return dataUri;
}

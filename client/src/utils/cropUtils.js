// src/utils/cropUtils.js
export async function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Retourne un File JPEG de taille fixe (ex: 400x400) correspondant au crop demandé.
 * @param {object} params
 * @param {string} params.imageSrc - URL de l'image source (blob: ou http(s):)
 * @param {object} params.pixelCrop - croppedAreaPixels (x, y, width, height) de react-easy-crop
 * @param {string} [params.fileName='cropped.jpg'] - nom du fichier de sortie
 * @param {number} [params.outputSize=400] - taille carrée de sortie en px
 * @param {number} [params.quality=0.9] - qualité JPEG (0-1)
 * @returns {Promise<File>}
 */
export async function getCroppedImage({
  imageSrc,
  pixelCrop,
  fileName = 'cropped.jpg',
  outputSize = 400,
  quality = 0.9,
}) {
  const image = await createImage(imageSrc);

  // Canvas final (fixed size)
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  // On dessine la zone cropée (pixelCrop) extraite de l'image source,
  // puis on la redimensionne pour remplir le canvas outputSize x outputSize.
  // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  ctx.drawImage(
    image,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas is empty'));
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', quality);
  });
}

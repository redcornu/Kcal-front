document.getElementById('file-input').addEventListener('change', async (event) => {
  const fileInput = document.getElementById('file-input');
  const errorElement = document.getElementById('error');
  const uploadBox = document.getElementById('upload-box');
  const loader = document.getElementById('loader');

  if (!fileInput.files.length) {
    errorElement.textContent = 'Please select a file first';
    return;
  }

  const selectedFile = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    const img = new Image();
    img.src = e.target.result;

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const maxWidth = 800;
      const maxHeight = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      let compressedImageUrl;
      let quality = 0.9;
      let blob;

      do {
        compressedImageUrl = canvas.toDataURL('image/webp', quality);
        const byteString = atob(compressedImageUrl.split(',')[1]);
        const buffer = new ArrayBuffer(byteString.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < byteString.length; i++) {
          view[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([view], { type: 'image/webp' });
        if (blob.size <= 100000) break;
        quality -= 0.1;
      } while (quality > 0.1);

      if (blob.size > 100000) {
        errorElement.textContent = '이미지를 100KB 이하로 압축할 수 없습니다.';
        return;
      }

      uploadBox.innerHTML = '<p>분석 중...</p>';
      loader.style.display = 'block';

      const readerForBlob = new FileReader();
      readerForBlob.onloadend = async () => {
        try {
          const response = await fetch('https://port-0-kcal-back-lxlts66g89582f3b.sel5.cloudtype.app/analyze-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: readerForBlob.result }),
          });

          const data = await response.json();

          if (response.ok) {
            const markdownResult = marked.parse(data.analysis);
            uploadBox.innerHTML = `<p>- 결과 -</p>${markdownResult}`;
            errorElement.textContent = '';
          } else {
            errorElement.textContent = data.error;
          }
        } catch (error) {
          console.error('Error occurred:', error);
          errorElement.textContent = '에러 발생';
        } finally {
          loader.style.display = 'none';
        }
      };
      readerForBlob.readAsDataURL(blob);
    };
  };

  reader.readAsDataURL(selectedFile);
});

document.addEventListener('DOMContentLoaded', function () {
    const fileInput = document.getElementById('fileInput');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const pixelSizeInput = document.getElementById('pixelSize');
    const processButton = document.getElementById('processButton');
    const pixelateButton = document.getElementById('pixelateButton');
    const replaceWithNumbersButton = document.getElementById('replaceWithNumbersButton');
    const removeBackgroundButton = document.getElementById('removeBackgroundButton');
    const downloadButton = document.getElementById('downloadButton');
    const setColorsButton = document.getElementById('setColorsButton');
    let originalImageData;
    let currentImageData;
    let img = new Image();

    let colorPalette = [];
    let cellNumbers = [];

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                currentImageData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
                processButton.removeAttribute('disabled');
                pixelateButton.removeAttribute('disabled');
                replaceWithNumbersButton.removeAttribute('disabled');
                removeBackgroundButton.removeAttribute('disabled');
                downloadButton.removeAttribute('disabled');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    processButton.addEventListener('click', function () {
        if (!currentImageData) return;
        currentImageData = reduceColors(currentImageData, colorPalette); // reduce a los colores definidos
        ctx.putImageData(currentImageData, 0, 0);
    });

    pixelateButton.addEventListener('click', function () {
        if (!currentImageData) return;
        const pixelSize = parseInt(pixelSizeInput.value);
        currentImageData = pixelateImage(ctx, canvas, currentImageData, pixelSize);
        ctx.putImageData(currentImageData, 0, 0);
    });

    replaceWithNumbersButton.addEventListener('click', function () {
        if (!currentImageData) return;
        const pixelSize = parseInt(pixelSizeInput.value);
        const cols = Math.floor(canvas.width / pixelSize);
        const rows = Math.floor(canvas.height / pixelSize);
        divideImage(cols, rows, currentImageData, pixelSize);
    });

    removeBackgroundButton.addEventListener('click', function () {
        if (!currentImageData) return;
        removeBackground(currentImageData);
    });

    downloadButton.addEventListener('click', downloadImage);

    setColorsButton.addEventListener('click', function () {
        colorPalette = [];
        for (let i = 1; i <= 16; i++) {
            const colorInput = document.getElementById(`colorInput${i}`).value.trim();
            if (colorInput) {
                const color = parseRgb(colorInput);
                colorPalette.push({ ...color, number: i });
            }
        }
    });

    function reduceColors(imageData, palette) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const nearestColor = findNearestColor(r, g, b, palette);
            data[i] = nearestColor.r;
            data[i + 1] = nearestColor.g;
            data[i + 2] = nearestColor.b;
        }

        return imageData;
    }

    function findNearestColor(r, g, b, palette) {
        let minDistance = Infinity;
        let nearestColor = palette[0];

        for (const color of palette) {
            const distance = colorDistance(r, g, b, color.r, color.g, color.b);
            if (distance < minDistance) {
                minDistance = distance;
                nearestColor = color;
            }
        }

        return nearestColor;
    }

    function colorDistance(r1, g1, b1, r2, g2, b2) {
        return Math.sqrt(
            Math.pow(r2 - r1, 2) +
            Math.pow(g2 - g1, 2) +
            Math.pow(b2 - b1, 2)
        );
    }

    function pixelateImage(ctx, canvas, imageData, pixelSize) {
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const pixelatedData = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const red = [];
                const green = [];
                const blue = [];

                for (let j = 0; j < pixelSize; j++) {
                    for (let i = 0; i < pixelSize; i++) {
                        const pixelIndex = ((y + j) * width + (x + i)) * 4;
                        if (pixelIndex < data.length) {
                            red.push(data[pixelIndex]);
                            green.push(data[pixelIndex + 1]);
                            blue.push(data[pixelIndex + 2]);
                        }
                    }
                }

                const avgRed = red.reduce((a, b) => a + b) / red.length;
                const avgGreen = green.reduce((a, b) => a + b) / green.length;
                const avgBlue = blue.reduce((a, b) => a + b) / blue.length;

                const pixelIndex = (y * width + x) * 4;
                for (let j = 0; j < pixelSize; j++) {
                    for (let i = 0; i < pixelSize; i++) {
                        const index = ((y + j) * width + (x + i)) * 4;
                        if (index < data.length) {
                            pixelatedData[index] = avgRed;
                            pixelatedData[index + 1] = avgGreen;
                            pixelatedData[index + 2] = avgBlue;
                            pixelatedData[index + 3] = data[pixelIndex + 3];
                        }
                    }
                }
            }
        }

        return new ImageData(pixelatedData, width, height);
    }

    function divideImage(cols, rows, imageData, pixelSize) {
        const width = pixelSize;
        const height = pixelSize;
        ctx.putImageData(imageData, 0, 0);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * width, 0);
            ctx.lineTo(i * width, canvas.height);
            ctx.stroke();
        }

        for (let j = 0; j <= rows; j++) {
            ctx.beginPath();
            ctx.moveTo(0, j * height);
            ctx.lineTo(canvas.width, j * height);
            ctx.stroke();
        }

        cellNumbers = [];  // Reset cellNumbers array
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const x = i * width;
                const y = j * height;
                const cellData = ctx.getImageData(x, y, width, height);
                const color = getAverageColor(cellData.data);
                const colorNumber = getColorNumber(color);

                cellNumbers.push({ x, y, width, height, number: colorNumber });
            }
        }

        drawNumbers();
    }

    function drawNumbers() {
        cellNumbers.forEach(cell => {
            const { x, y, width, height, number } = cell;
            const fontSize = Math.min(width, height) * 0.4;
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = number === 0 ? 'white' : 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(number, x + width / 2, y + height / 2);
        });
    }

    function getAverageColor(data) {
        let r = 0, g = 0, b = 0;
        const length = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        return { r: r / length, g: g / length, b: b / length };
    }

    function getColorNumber(color) {
        const nearestColor = findNearestColor(color.r, color.g, color.b, colorPalette);
        return colorPalette.find(c => c === nearestColor).number;
    }

    function parseRgb(rgbString) {
        const [r, g, b] = rgbString.match(/\d+/g).map(Number);
        return { r, g, b };
    }

    function removeBackground(imageData) {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const alpha = data[i + 3];

            if (alpha !== 0) {
                data[i + 3] = 0; // Hacer transparente
            }
        }

        ctx.putImageData(imageData, 0, 0);
        drawGrid(); // Re-aplicar las grillas después de eliminar el fondo
        drawNumbers(); // Re-aplicar los números después de eliminar el fondo
    }

    function downloadImage() {
        const link = document.createElement('a');
        link.download = 'imagen_procesada.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    function drawGrid() {
        const pixelSize = parseInt(pixelSizeInput.value);
        const cols = Math.floor(canvas.width / pixelSize);
        const rows = Math.floor(canvas.height / pixelSize);

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * pixelSize, 0);
            ctx.lineTo(i * pixelSize, canvas.height);
            ctx.stroke();
        }

        for (let j = 0; j <= rows; j++) {
            ctx.beginPath();
            ctx.moveTo(0, j * pixelSize);
            ctx.lineTo(canvas.width, j * pixelSize);
            ctx.stroke();
        }
    }
});

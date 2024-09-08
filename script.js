let scene, camera, renderer, instancedMesh;
let video, videoCanvas, videoContext;
let currentImageData;

// 글로벌 변수 추가
let minBrightness = 0.0;
let maxBrightness = 1.0;
let minSize = 0.005;
let maxSize = 0.05;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 파티클 시스템 생성
    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const gridSize = 100;
    const totalParticles = gridSize * gridSize;
    instancedMesh = new THREE.InstancedMesh(planeGeometry, material, totalParticles);

    const spacing = 2 / gridSize;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const x = -1 + i * spacing;
            const y = 1 - j * spacing; // y 좌표를 반전

            matrix.makeScale(minSize, minSize, 1);
            matrix.setPosition(x, y, 0);
            instancedMesh.setMatrixAt(index, matrix);

            color.setRGB(1, 1, 1);
            instancedMesh.setColorAt(index, color);
        }
    }

    scene.add(instancedMesh);

    camera.position.z = 1;

    // 웹캠 설정
    video = document.getElementById('webcamVideo');
    videoCanvas = document.createElement('canvas');
    videoContext = videoCanvas.getContext('2d');

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
        })
        .catch(function(error) {
            console.error("웹캠을 사용할 수 없습니다:", error);
        });

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    let width, height;
    if (aspect > 1) {
        width = 1;
        height = 1 / aspect;
    } else {
        width = aspect;
        height = 1;
    }
    camera.left = -width;
    camera.right = width;
    camera.top = height;
    camera.bottom = -height;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function calculateBrightness(r, g, b) {
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

function updateParticles() {
    const gridSize = Math.sqrt(instancedMesh.count);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const x = i / gridSize;
            const y = 1 - (j / gridSize); // 여기서 y 좌표를 반전시킵니다.

            const colorIndex = Math.floor(y * videoCanvas.height) * videoCanvas.width + Math.floor(x * videoCanvas.width);
            const r = currentImageData.data[colorIndex * 4] / 255;
            const g = currentImageData.data[colorIndex * 4 + 1] / 255;
            const b = currentImageData.data[colorIndex * 4 + 2] / 255;

            color.setRGB(r, g, b);
            instancedMesh.setColorAt(index, color);

            const brightness = calculateBrightness(r, g, b);
            const normalizedBrightness = (brightness - minBrightness) / (maxBrightness - minBrightness);
            const size = minSize + normalizedBrightness * (maxSize - minSize);

            instancedMesh.getMatrixAt(index, matrix);
            matrix.makeScale(size, size, 1);
            // y 좌표를 반전하지 않고 그대로 사용합니다.
            matrix.setPosition((i / (gridSize - 1)) * 2 - 1, (j / (gridSize - 1)) * 2 - 1, 0);
            instancedMesh.setMatrixAt(index, matrix);
        }
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    instancedMesh.instanceColor.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        videoCanvas.width = video.videoWidth;
        videoCanvas.height = video.videoHeight;
        videoContext.drawImage(video, 0, 0);

        currentImageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);

        updateParticles();
    }

    renderer.render(scene, camera);
}

function setBrightnessRange(min, max) {
    minBrightness = Math.max(0, Math.min(1, min));
    maxBrightness = Math.max(0, Math.min(1, max));
}

function setParticleSizeRange(min, max) {
    minSize = Math.max(0.001, min);
    maxSize = Math.max(minSize, max);
}

init();
animate();
let scene, camera, renderer, particles;
let video, videoCanvas, videoContext;
let currentImageData;
let baseParticleSize;
let maxParticleSizeMultiplier = 5; // 최대 파티클 사이즈 배수
const gridSize = 200; // 100에서 200으로 증가
const totalParticles = 5000; // 40000에서 10000으로 감소
let gridWidth, gridHeight;

// 새로운 변수 추가
let referenceColor = { r: .1, g: .1, b: .1 }; // 기본값은 흰색 (1, 1, 1)

function calculateBaseParticleSize() {
    const smallestDimension = Math.min(window.innerWidth, window.innerHeight);
    baseParticleSize = (smallestDimension / Math.sqrt(totalParticles)) * 3; // 크기 증가
}

function calculateGrid() {
    const aspect = video.videoWidth / video.videoHeight;
    if (aspect > 1) {
        gridWidth = Math.sqrt(totalParticles * aspect);
        gridHeight = totalParticles / gridWidth;
    } else {
        gridHeight = Math.sqrt(totalParticles / aspect);
        gridWidth = totalParticles / gridHeight;
    }
    gridWidth = Math.floor(gridWidth);
    gridHeight = Math.floor(gridHeight);
}

function init() {
    calculateBaseParticleSize();

    scene = new THREE.Scene();
    // OrthographicCamera로 변경
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2; // 1.5에서 2로 증가
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 1000
    );
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 파티클 시스템 생성
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(gridWidth * gridHeight * 3);
    const colors = new Float32Array(gridWidth * gridHeight * 3);
    const sizes = new Float32Array(gridWidth * gridHeight);

    const spacingX = 2 / gridWidth;
    const spacingY = 2 / gridHeight;

    let index = 0;
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            positions[index] = -1 + j * spacingX;     // x
            positions[index + 1] = 1 - i * spacingY;  // y
            positions[index + 2] = 0;                 // z

            // 모든 파티클을 흰색으로 초기화
            colors[index] = 1;     // R
            colors[index + 1] = 1; // G
            colors[index + 2] = 1; // B

            sizes[index / 3] = baseParticleSize; // 초기 크기 설정

            index += 3;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        sizeAttenuation: false, // false로 변경
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 1; // 카메라 위치 조정

    // 웹캠 설정
    video = document.getElementById('webcamVideo');
    videoCanvas = document.createElement('canvas');
    videoContext = videoCanvas.getContext('2d');

    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
            video.onloadedmetadata = function() {
                calculateGrid();
                createParticles();
            };
        })
        .catch(function(error) {
            console.error("웹캠을 사용할 수 없습니다:", error);
        });

    window.addEventListener('resize', onWindowResize, false);
}

function createParticles() {
    scene.remove(particles);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(gridWidth * gridHeight * 3);
    const colors = new Float32Array(gridWidth * gridHeight * 3);
    const sizes = new Float32Array(gridWidth * gridHeight);

    const spacingX = 2 / gridWidth;
    const spacingY = 2 / gridHeight;

    let index = 0;
    for (let i = 0; i < gridHeight; i++) {
        for (let j = 0; j < gridWidth; j++) {
            positions[index] = -1 + j * spacingX;     // x
            positions[index + 1] = 1 - i * spacingY;  // y
            positions[index + 2] = 0;                 // z

            // 모든 파티클을 흰색으로 초기화
            colors[index] = 1;     // R
            colors[index + 1] = 1; // G
            colors[index + 2] = 1; // B

            sizes[index / 3] = baseParticleSize; // 초기 크기 설정

            index += 3;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        sizeAttenuation: false, // false로 변경
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function onWindowResize() {
    calculateBaseParticleSize();
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 카메라 비율이 변경되었을 때 그리드 재계산
    calculateGrid();
    createParticles();
}

function findBrightestPixel() {
    // ... 기존 코드 ...
}

function updateParticles() {
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;
    const sizes = particles.geometry.attributes.size.array;

    for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
        const x = (positions[i] + 1) / 2;
        const y = 1 - (positions[i + 1] + 1) / 2;

        const colorIndex = Math.floor(y * videoCanvas.height) * videoCanvas.width + Math.floor(x * videoCanvas.width);
        const r = currentImageData.data[colorIndex * 4] / 255;
        const g = currentImageData.data[colorIndex * 4 + 1] / 255;
        const b = currentImageData.data[colorIndex * 4 + 2] / 255;

        // 기준 색상과의 차이 계산
        const distanceFromReference = Math.sqrt(
            Math.pow(referenceColor.r - r, 2) +
            Math.pow(referenceColor.g - g, 2) +
            Math.pow(referenceColor.b - b, 2)
        );
        
        // 기준 색상에 가까울수록 큰 값을 가지도록 변환
        const similarity = 1 - distanceFromReference / Math.sqrt(3);

        // 파티클 색상 설정
        colors[i] = r;
        colors[i + 1] = g;
        colors[i + 2] = b;

        // 파티클 크기 조정 (기준 색상에 가까울수록 크기가 커짐)
        sizes[j] = baseParticleSize * (1 + Math.pow(similarity, 2) * maxParticleSizeMultiplier);
    }

    particles.geometry.attributes.color.needsUpdate = true;
    particles.geometry.attributes.size.needsUpdate = true;
}

// 기준 색상을 변경하는 함수 추가
function setReferenceColor(r, g, b) {
    referenceColor.r = r;
    referenceColor.g = g;
    referenceColor.b = b;
}

function computeOpticalFlow() {
    // ... 기존 코드 ...
}

function animate() {
    requestAnimationFrame(animate);

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        videoCanvas.width = video.videoWidth;
        videoCanvas.height = video.videoHeight;
        videoContext.drawImage(video, 0, 0);

        currentImageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);

        updateParticles();
        
        // 필요한 경우 여기서 파티클 사이즈를 동적으로 변경할 수 있습니다.
        // 예: setParticleSize(Math.random() * 10);
    }

    renderer.render(scene, camera);
}

init();
animate();
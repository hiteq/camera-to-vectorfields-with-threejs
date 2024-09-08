let scene, camera, renderer, instancedMesh;
let video, videoCanvas, videoContext;
let currentImageData;

// 글로벌 변수 수정 및 추가
let minBrightness = 0.2;
let maxBrightness = 0.5;
let particleSize = 0.025; // 고정된 파티클 크기
let gridSize = 40; // 그리드 사이즈를 글로벌 변수로 추가

// 회전 계수 추가
let rotationFactorX = 0.5;// 0.0 ~ 1.0
let rotationFactorY = 0.5;
let rotationFactorZ = 0;

// 네온 효과를 위한 글로벌 변수 추가
let isNeonEffect = true;
let neonIntensity = 0.01; // 0.0 ~ 1.0 사이의 값

// 파티클 컬러를 흰색으로 고정하는 기능을 위한 글로벌 변수 추가
let isWhiteColorFixed = true;

function init() {
    scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 2;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2, 
        frustumSize / 2, frustumSize / -2, 
        0.1, 10
    );
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 파티클 시스템 생성
    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const totalParticles = gridSize * gridSize;
    instancedMesh = new THREE.InstancedMesh(planeGeometry, material, totalParticles);

    const spacing = 2 / gridSize;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const x = (i / (gridSize - 1)) * 2 - 1;
            const y = 1 - (j / (gridSize - 1)) * 2;

            matrix.makeScale(particleSize, particleSize, 1);
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
    const frustumSize = 2;
    
    if (aspect > 1) {
        camera.left = -frustumSize * aspect / 2;
        camera.right = frustumSize * aspect / 2;
        camera.top = frustumSize / 2;
        camera.bottom = -frustumSize / 2;
    } else {
        camera.left = -frustumSize / 2;
        camera.right = frustumSize / 2;
        camera.top = frustumSize / (2 * aspect);
        camera.bottom = -frustumSize / (2 * aspect);
    }

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
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const x = i / gridSize;
            const y = 1 - (j / gridSize);

            const colorIndex = Math.floor(y * videoCanvas.height) * videoCanvas.width + Math.floor(x * videoCanvas.width);
            const r = currentImageData.data[colorIndex * 4] / 255;
            const g = currentImageData.data[colorIndex * 4 + 1] / 255;
            const b = currentImageData.data[colorIndex * 4 + 2] / 255;

            if (isWhiteColorFixed) {
                color.setRGB(1, 1, 1); // 흰색으로 고정
            } else {
                let adjustedR = r, adjustedG = g, adjustedB = b;
                if (isNeonEffect) {
                    // 네온 효과 적용
                    adjustedR = r + (1 - r) * neonIntensity;
                    adjustedG = g + (1 - g) * neonIntensity;
                    adjustedB = b + (1 - b) * neonIntensity;
                }
                color.setRGB(adjustedR, adjustedG, adjustedB);
            }

            instancedMesh.setColorAt(index, color);

            const brightness = calculateBrightness(r, g, b);
            const normalizedBrightness = (brightness - minBrightness) / (maxBrightness - minBrightness);

            // 회전 기준을 반전시킵니다
            const rotationFactor = 1 - normalizedBrightness;

            // 명도에 따른 3D 회전 각도 계산 (반전된 기준 적용)
            const rotationX = rotationFactor * Math.PI * rotationFactorX;
            const rotationY = rotationFactor * Math.PI * rotationFactorY;
            const rotationZ = rotationFactor * Math.PI * rotationFactorZ;

            euler.set(rotationX, rotationY, rotationZ, 'XYZ');
            quaternion.setFromEuler(euler);

            matrix.compose(
                new THREE.Vector3((i / (gridSize - 1)) * 2 - 1, (j / (gridSize - 1)) * 2 - 1, 0),
                quaternion,
                new THREE.Vector3(particleSize, particleSize, 1)
            );

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

// 회전 계수를 설정는 함수 추가
function setRotationFactors(x, y, z) {
    rotationFactorX = x;
    rotationFactorY = y;
    rotationFactorZ = z;
}

// 그리드 사이즈를 설정하는 함수 추
function setGridSize(size) {
    gridSize = size;
    // 그리드 사이즈가 변경되면 파티클 시스템을 재생성해야 합니다.
    recreateParticleSystem();
}

// 파티클 시스템을 재생성하는 함수
function recreateParticleSystem() {
    scene.remove(instancedMesh);

    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const totalParticles = gridSize * gridSize;
    instancedMesh = new THREE.InstancedMesh(planeGeometry, material, totalParticles);

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const index = i * gridSize + j;
            const x = (i / (gridSize - 1)) * 2 - 1;
            const y = 1 - (j / (gridSize - 1)) * 2;

            matrix.makeScale(particleSize, particleSize, 1);
            matrix.setPosition(x, y, 0);
            instancedMesh.setMatrixAt(index, matrix);

            color.setRGB(1, 1, 1);
            instancedMesh.setColorAt(index, color);
        }
    }

    scene.add(instancedMesh);
}

// 네온 효과를 켜고 끄는 함수
function toggleNeonEffect(enable) {
    isNeonEffect = enable;
}

// 네온 효과의 강도를 설정하는 함수
function setNeonIntensity(intensity) {
    neonIntensity = Math.max(0, Math.min(1, intensity));
}

// 파티클 컬러를 흰색으로 고정하는 기능을 켜고 끄는 함수
function toggleWhiteColorFixed(enable) {
    isWhiteColorFixed = enable;
}

init();
animate();

// UI 컨트롤 연결
document.getElementById('minBrightness').addEventListener('input', function(e) {
    minBrightness = parseFloat(e.target.value);
});

document.getElementById('maxBrightness').addEventListener('input', function(e) {
    maxBrightness = parseFloat(e.target.value);
});

document.getElementById('particleSize').addEventListener('input', function(e) {
    particleSize = parseFloat(e.target.value);
    recreateParticleSystem();
});

document.getElementById('gridSize').addEventListener('input', function(e) {
    setGridSize(parseInt(e.target.value));
});

document.getElementById('rotationX').addEventListener('input', function(e) {
    rotationFactorX = parseFloat(e.target.value);
});

document.getElementById('rotationY').addEventListener('input', function(e) {
    rotationFactorY = parseFloat(e.target.value);
});

document.getElementById('rotationZ').addEventListener('input', function(e) {
    rotationFactorZ = parseFloat(e.target.value);
});

document.getElementById('neonEffect').addEventListener('change', function(e) {
    toggleNeonEffect(e.target.checked);
});

document.getElementById('neonIntensity').addEventListener('input', function(e) {
    setNeonIntensity(parseFloat(e.target.value));
});

document.getElementById('whiteColorFixed').addEventListener('change', function(e) {
    toggleWhiteColorFixed(e.target.checked);
});
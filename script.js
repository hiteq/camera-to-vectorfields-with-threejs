let scene, camera, renderer, particles;
let video, videoCanvas, videoContext;
let previousImageData, currentImageData;
let flowField = [];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 파티클 시스템 생성
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(10000 * 3);
    const colors = new Float32Array(10000 * 3);

    const gridSize = 100; // 그리드 크기 설정
    const spacing = 2 / gridSize; // 파티클 간격 설정

    let index = 0;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            positions[index] = -1 + i * spacing;     // x
            positions[index + 1] = -1 + j * spacing; // y
            positions[index + 2] = 0;                // z

            colors[index] = Math.random();
            colors[index + 1] = Math.random();
            colors[index + 2] = Math.random();

            index += 3;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 5,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

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

function computeOpticalFlow() {
    const width = videoCanvas.width;
    const height = videoCanvas.height;
    flowField = [];

    for (let y = 0; y < height; y += 10) {
        for (let x = 0; x < width; x += 10) {
            const index = (y * width + x) * 4;
            const dx = (currentImageData.data[index] - previousImageData.data[index]) / 255;
            const dy = (currentImageData.data[index + 1] - previousImageData.data[index + 1]) / 255;
            flowField.push({ x: dx, y: -dy }); // y 방향 뒤집음
        }
    }
}

function updateParticles() {
    const positions = particles.geometry.attributes.position.array;
    const colors = particles.geometry.attributes.color.array;

    for (let i = 0; i < positions.length; i += 3) {
        const x = (positions[i] + 1) / 2;
        const y = (-positions[i + 1] + 1) / 2; // y 좌표 변환

        const flowIndex = Math.floor(y * 48) * 64 + Math.floor(x * 64);
        const flow = flowField[flowIndex] || { x: 0, y: 0 };

        positions[i] += flow.x * 0.1;
        positions[i + 1] += flow.y * 0.1; // y 방향 수정

        // 경계 처리
        if (positions[i] > 1) positions[i] = -1;
        if (positions[i] < -1) positions[i] = 1;
        if (positions[i + 1] > 1) positions[i + 1] = -1;
        if (positions[i + 1] < -1) positions[i + 1] = 1;

        // 색상 업데이트
        const colorIndex = Math.floor(y * videoCanvas.height) * videoCanvas.width + Math.floor(x * videoCanvas.width);
        colors[i] = currentImageData.data[colorIndex * 4] / 255;
        colors[i + 1] = currentImageData.data[colorIndex * 4 + 1] / 255;
        colors[i + 2] = currentImageData.data[colorIndex * 4 + 2] / 255;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        videoCanvas.width = video.videoWidth;
        videoCanvas.height = video.videoHeight;
        videoContext.drawImage(video, 0, 0);

        previousImageData = currentImageData;
        currentImageData = videoContext.getImageData(0, 0, videoCanvas.width, videoCanvas.height);

        if (previousImageData) {
            computeOpticalFlow();
            updateParticles();
        }
    }

    renderer.render(scene, camera);
}

init();
animate();
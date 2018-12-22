var mixer, actions, activeAction, previousAction;
var scene, camera, renderer, clock;
var arToolkitSource, arToolkitContext;

initialize();
animate();

function initialize() {
    scene = new THREE.Scene();
    camera = new THREE.Camera();

    scene.add(camera);

    //Add Light in Scene
    var light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 20, 0);
    scene.add(light);

    //Add Light in Scene
    light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 20, 10);
    scene.add(light);

    //Create WebGLRenderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    document.body.appendChild(renderer.domElement);

    //Initalize Clock for Animation
    clock = new THREE.Clock();

    // Setup arToolkitSource
    arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'webcam',
    });

    //Resize Function
    function onResize() {
        arToolkitSource.onResize()
        arToolkitSource.copySizeTo(renderer.domElement)
        if (arToolkitContext.arController !== null) {
            arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)
        }
    }

    // Handle Resize Event
    arToolkitSource.init(function onReady() {
        onResize()
    });

    // Handle Resize Event
    window.addEventListener('resize', function () {
        onResize()
    });

    // Create atToolkitContext
    arToolkitContext = new THREEx.ArToolkitContext({
        cameraParametersUrl: 'assets/data/camera_para.dat',
        detectionMode: 'mono_and_matrix'
    });

    // Copy projection matrix to camera when initialization complete
    arToolkitContext.init(function onCompleted() {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
    });

    // Marker Root for Detected Area by arToolkit
    var marker_root = new THREE.Group();
    scene.add(marker_root);

    // Initalize Main Marker Controls
    let marker_controls_main = new THREEx.ArMarkerControls(arToolkitContext, marker_root, {
        type: 'pattern',
        patternUrl: "assets/marker/eeee.patt",
    });

    // Initalize Other Marker Controls
    markers = ["dance", "running", "idle", "jump", "punch", "wave"];
    for (const [i, element] of markers.entries()) {
        new THREEx.ArMarkerControls(arToolkitContext, new THREE.Group(), {
            type: 'pattern',
            patternUrl: "assets/marker/" + element + ".patt",
        }).addEventListener('markerFound', function (event) {
            var a = element.charAt(0).toUpperCase() + element.slice(1);
            if (i < 3) {
                if (activeAction._clip.name != a)
                    fadeToAction(a, 0.5);
            }
            else {
                if (activeAction._clip.name == "Idle" || activeAction._clip.name == "Running" || activeAction._clip.name == "Dance") {
                    fadeToAction(a, 0.2);
                    mixer.addEventListener('finished', function () {
                        mixer.removeEventListener('finished', this);
                        fadeToAction("Idle", 0.2);
                    });
                }
            }
        });
    }

    // Add Plane in Scene
    var mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(1.5, 1.5), new THREE.MeshPhongMaterial({ color: 0x000000, depthWrite: true, opacity: .5 }));
    mesh.rotation.x = - Math.PI / 2;
    marker_root.add(mesh);

    // Add Grid Lines in Scene
    var grid = new THREE.GridHelper(20, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    marker_root.add(grid);

    // Load GLTF Model
    var loader = new THREE.GLTFLoader();
    loader.load('assets/model/RobotExpressive.glb', function (gltf) {
        model = gltf.scene;
        model.scale.set(.5, .5, .5);
        marker_root.add(model);

        var states = ['Idle', 'Running', 'Dance'];
        var emotes = ['Jump', 'Wave', 'Punch'];
        // Create Animation Mixer
        mixer = new THREE.AnimationMixer(model);
        actions = {};
        // Add Animation Clip to Actions by GLTF Model
        for (var i = 0; i < gltf.animations.length; i++) {
            var clip = gltf.animations[i];
            var action = mixer.clipAction(clip);
            actions[clip.name] = action;
            if (emotes.indexOf(clip.name) >= 0 || states.indexOf(clip.name) >= 4) {
                action.clampWhenFinished = true;
                action.loop = THREE.LoopOnce;
            }
        }

        //Play Default Animation
        previousAction = actions['Idle'];
        activeAction = actions['Idle'];
        activeAction.play();

    }, undefined, function (e) { console.error(e); });
}

// Smooth Animation Transition
function fadeToAction(name, duration) {
    previousAction = activeAction;
    activeAction = actions[name];
    if (previousAction !== activeAction) {
        previousAction.fadeOut(duration);
    }
    activeAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
}

// Update arToolkit on Every Frame
function update() {
    if (arToolkitSource.ready !== false)
        arToolkitContext.update(arToolkitSource.domElement);
}

// Render All Scenes
function render() {
    renderer.render(scene, camera);
}

// Animate and triggered Update and Render
function animate() {
    var dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    update();
    render();
}

document.getElementsByClassName("exit").addEventListener("click", function () {

});
function closeDialog() {
    document.getElementById("dialog").outerHTML = "";
}

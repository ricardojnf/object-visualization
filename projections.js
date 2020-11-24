var gl; var program; var object;
var at ,eye, up;
var mModelLocation, mViewLocation, mProjectionLocation;
var mView, mProjection, mInitialProjection;
var filled = false, zBuffer = false, backFaceCulling = false;
var axonometricFreeGamma, axonometricFreeTheta, obliqueFreeL, obliqueFreeAlpha, superquadricFreeE1, superquadricFreeE2;
var lastViewOrthogonal = '', lastViewAxonometric = '', lastViewOblique = '';
var zoomAcum = mat4();
var showingPerspective = false;

window.onresize = function() { resize(gl.canvas); };

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl) { alert("WebGL isn't available"); }

    // Events listeners
    document.addEventListener("keydown", function() { keyboard(event.which); } );
    
    canvas.addEventListener("wheel", function() {
        var factor = 1.05;
        var zoom;
        if (event.deltaY < 0) { zoom = scalem(factor, factor, factor); }
        else { zoom = scalem(1/factor, 1/factor, 1/factor); }
        zoomAcum = mult(zoomAcum, zoom);
        mProjection = mult(mProjection, zoom);
    } );

    document.getElementById("viewOrthogonal").addEventListener("click", function() { showMainOption('orthogonal'); } );
    document.getElementById("viewAxonometric").addEventListener("click", function() { showMainOption('axonometric'); } );
    document.getElementById("viewOblique").addEventListener("click", function() { showMainOption('oblique'); } );
    document.getElementById("viewPerspective").addEventListener("click", function() { showMainOption('perspective'); } );
    document.getElementById("viewObjects").addEventListener("click", function() { showMainOption('objects'); } );

    document.getElementById("orthogonalMain").addEventListener("click", function() { orthogonal('main', true); } );
    document.getElementById("orthogonalFloor").addEventListener("click", function() { orthogonal('floor', true); } );
    document.getElementById("orthogonalRight").addEventListener("click", function() { orthogonal('right', true); } );
    
    document.getElementById("axonometricFreeOptionsGamma").addEventListener("input", function() { changeAxonometricFreeValue('gamma', this.value); axonometric('free'); } );
    document.getElementById("axonometricFreeOptionsTheta").addEventListener("input", function() { changeAxonometricFreeValue('theta', this.value); axonometric('free'); } );
    document.getElementById("axonometricFree").addEventListener("click", function() { axonometric('free'); } );
    document.getElementById("axonometricIsometry").addEventListener("click", function() { axonometric('isometry'); } );
    document.getElementById("axonometricDimetry").addEventListener("click", function() { axonometric('dimetry'); } );
    document.getElementById("axonometricTrimetry").addEventListener("click", function() { axonometric('trimetry'); } );

    document.getElementById("obliqueFreeOptionsL").addEventListener("input", function() { changeObliqueFreeValue('l', this.value); oblique('free'); } );
    document.getElementById("obliqueFreeOptionsAlpha").addEventListener("input", function() { changeObliqueFreeValue('alpha', this.value); oblique('free'); } );
    document.getElementById("obliqueFree").addEventListener("click", function() { oblique('free'); } );
    document.getElementById("obliqueKnight").addEventListener("click", function() { oblique('knight'); } );
    document.getElementById("obliqueCabinet").addEventListener("click", function() { oblique('cabinet'); } );

    document.getElementById("perspectiveFreeOptionsD").addEventListener("input", function() { changePerspectiveFreeValue('d', this.value); perspectiveOption(); } );

    document.getElementById("objectSphere").addEventListener("input", function() { create('sphere'); } );
    document.getElementById("objectCube").addEventListener("input", function() { create('cube'); } );
    document.getElementById("objectTorus").addEventListener("input", function() { create('torus'); } );
    document.getElementById("objectCylinder").addEventListener("input", function() { create('cylinder'); } );
    document.getElementById("objectBunny").addEventListener("input", function() { create('bunny'); } );
    document.getElementById("objectSuperquadric").addEventListener("input", function() { create('superquadric'); } );
    document.getElementById("superquadricFreeOptionsE1").addEventListener("input", function() { changeSuperquadricFreeValue('e1', this.value); } );
    document.getElementById("superquadricFreeOptionsE2").addEventListener("input", function() { changeSuperquadricFreeValue('e2', this.value); } );

    // Initializing objects
    sphereInit(gl);
    cubeInit(gl);
    torusInit(gl);
    cylinderInit(gl);
    bunnyInit(gl);
    //superquadricInit(gl);
    create('cube');
    
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    mView = mat4();
    
    mProjectionLocation = gl.getUniformLocation(program, "mProjection");
    mModelLocation = gl.getUniformLocation(program, "mModel");
    mViewLocation = gl.getUniformLocation(program, "mView");

    setAxonometricFreeOptions();
    setObliqueFreeOptions();
    setPerspectiveFreeOptions();
    setSuperquadricFreeOptions();
    enableDisableFreeOptions('obliqueFreeOptions', false);
    enableDisableFreeOptions('superquadricFreeOptions', false);

    updateInfos();
    
    resize(canvas);
    showMainOption('axonometric');
    axonometric('dimetry');
    
    render();
}

function keyboard(event) {
    switch (event) {
        case (87): // 'W' key
            filled = false;
            break;
        case (70): // 'F' key
            filled = true;
            break;
        case (90): // 'Z' key
            zBuffer = !zBuffer;
            break;
        case (66): // 'B' ke
            backFaceCulling = !backFaceCulling;
            break;
    }
    enableDisableHSR();
    updateInfos();
}

function resize(canvas) {
    // Ajust canvas size
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1.0);

    var ratio = canvas.width / canvas.height;
    
    mInitialProjection = ortho(-ratio, ratio, -1, 1, -10, 10);
    mProjection = mult(mInitialProjection, zoomAcum);
}

// Show main option
function showMainOption(id) {
    var numberOptions = document.getElementsByClassName("secondary-option").length;

    for (var option = 0; option < numberOptions; option++) {
        var form = document.getElementsByClassName("secondary-option")[option];
        form.style.display = "none";
        var optionID = "view" + form.id.charAt(0).toUpperCase() + form.id.substring(1);
        document.getElementById(optionID).style.backgroundColor = "rgba(200, 200, 200, 1)";
        document.getElementById(optionID).style.color = "rgba(0, 0, 0, 1)";
    }
    
    document.getElementById(id).style.display = "block";
    var optionID = "view" + id.charAt(0).toUpperCase() + id.substring(1);
    document.getElementById(optionID).style.backgroundColor = "rgba(100, 100, 100, 1)";
    document.getElementById(optionID).style.color = "rgba(255, 255, 255, 1)";

    showingPerspective = false;
    switch (id) {
        case ('orthogonal'):
            if (lastViewOrthogonal != '')
                orthogonal(lastViewOrthogonal, true);
            break;
        case ('axonometric'):
            if (lastViewAxonometric != '')
                axonometric(lastViewAxonometric);
            break;
        case ('oblique'):
            if (lastViewOblique != '')
                oblique(lastViewOblique);
            break;
        case ('perspective'):
            showingPerspective = true;
            perspectiveOption();
            break;
    }
}

function enableDisableHSR() {
    if (zBuffer)
        gl.enable(gl.DEPTH_TEST);
    else
        gl.disable(gl.DEPTH_TEST);
    
    if (backFaceCulling)
        gl.enable(gl.CULL_FACE);
    else
        gl.disable(gl.CULL_FACE);
}

// Update text on canvas
function updateInfos() {
    if (zBuffer) {
        document.getElementById("zBuffer").innerHTML = "Ativo";
    } else {
        document.getElementById("zBuffer").innerHTML = "Desativo";
    }

    if (backFaceCulling) {
        document.getElementById("backFaceCulling").innerHTML = "Ativo";
    } else {
        document.getElementById("backFaceCulling").innerHTML = "Desativo";
    }
}

/*------------- FREE OPTIONS ------------------*/

// Set initial axonometric free options from HTML content
function setAxonometricFreeOptions() {
    var GammaInfo = document.getElementById("axonometricFreeOptionsGamma");
    changeAxonometricFreeValue('gamma', GammaInfo.getAttribute("value"));
    document.getElementById("axonometricFreeOptionsGammaMin").innerText = GammaInfo.getAttribute("min");
    document.getElementById("axonometricFreeOptionsGammaMax").innerText = GammaInfo.getAttribute("max");

    var ThetaInfo = document.getElementById("axonometricFreeOptionsTheta");
    changeAxonometricFreeValue('theta', ThetaInfo.getAttribute("value"));
    document.getElementById("axonometricFreeOptionsThetaMin").innerText = ThetaInfo.getAttribute("min");
    document.getElementById("axonometricFreeOptionsThetaMax").innerText = ThetaInfo.getAttribute("max");
}

// Set initial oblique free options from HTML content
function setObliqueFreeOptions() {
    var LInfo = document.getElementById("obliqueFreeOptionsL");
    changeObliqueFreeValue('l', LInfo.getAttribute("value"));
    document.getElementById("obliqueFreeOptionsLMin").innerText = LInfo.getAttribute("min");
    document.getElementById("obliqueFreeOptionsLMax").innerText = LInfo.getAttribute("max");

    var AlphaInfo = document.getElementById("obliqueFreeOptionsAlpha");
    changeObliqueFreeValue('alpha', AlphaInfo.getAttribute("value"));
    document.getElementById("obliqueFreeOptionsAlphaMin").innerText = AlphaInfo.getAttribute("min");
    document.getElementById("obliqueFreeOptionsAlphaMax").innerText = AlphaInfo.getAttribute("max");
}

// Set initial perspective free options from HTML content
function setPerspectiveFreeOptions() {
    var DInfo = document.getElementById("perspectiveFreeOptionsD");
    changePerspectiveFreeValue('d', DInfo.getAttribute("value"));
    document.getElementById("perspectiveFreeOptionsDMin").innerText = DInfo.getAttribute("min");
    document.getElementById("perspectiveFreeOptionsDMax").innerText = DInfo.getAttribute("max");
}

// Set initial superquadric free options from HTML content
function setSuperquadricFreeOptions() {
    var E1Info = document.getElementById("superquadricFreeOptionsE1");
    changeSuperquadricFreeValue('e1', E1Info.getAttribute("value"));
    document.getElementById("superquadricFreeOptionsE1Min").innerText = E1Info.getAttribute("min");
    document.getElementById("superquadricFreeOptionsE1Max").innerText = E1Info.getAttribute("max");

    var E2Info = document.getElementById("superquadricFreeOptionsE2");
    changeSuperquadricFreeValue('e2', E2Info.getAttribute("value"));
    document.getElementById("superquadricFreeOptionsE2Min").innerText = E2Info.getAttribute("min");
    document.getElementById("superquadricFreeOptionsE2Max").innerText = E2Info.getAttribute("max");
}

function enableDisableFreeOptions(optionsClass, validOptions) {
    var freeOptions = document.getElementsByClassName(optionsClass);
    for (var option = 0; validOptions && option < freeOptions.length; option++) {
        freeOptions[option].removeAttribute('disabled');
        freeOptions[option].style.opacity = 1;
    }
    for (var option = 0; !validOptions && option < freeOptions.length; option++) {
        freeOptions[option].setAttribute('disabled', 'true');
        freeOptions[option].style.opacity = 0.5;
    }
}

/*------------- PROCESS OBJECTS ------------------*/

function create(type) {
    var validOptions = false;
    mProjection = mInitialProjection;
    zoomAcum = mat4();
    switch (type) {
        case ('sphere'):
            object = ({m: mat4(), d: sphereDraw});
            break;
        case ('cube'):
            object = ({m: mat4(), d: cubeDraw});
            break;
        case ('torus'):
            object = ({m: mat4(), d: torusDraw});
            break;
        case ('cylinder'):
            object = ({m: mat4(), d: cylinderDraw});
            break;
        case ('bunny'):
            object = ({m: mat4(), d: bunnyDraw});
            break;
        case ('superquadric'):
            validOptions = true;
            object = ({m: mat4(), d: superquadricDraw});
            break;
    }
    enableDisableFreeOptions('superquadricFreeOptions', validOptions);
}

function changeSuperquadricFreeValue(option, value) {
    switch (option) {
        case ('e1'):
            superquadricFreeE1 = value;
            document.getElementById("superquadricFreeE1").innerHTML = value;
            break;
        case ('e2'):
            superquadricFreeE2 = value;
            document.getElementById("superquadricFreeE2").innerHTML = value;
            break;
    }
}

/*------------- ORTHOGONAL ------------------*/

function orthogonal(view, changeMemory) {
    mView = mat4();
    switch (view) {
        case ('floor'):
            mView = mult(mView, rotateX(90));
            break;
        case ('right'):
            mView = mult(mView, rotateY(-90));
            break;
    }
    if (changeMemory)
        lastViewOrthogonal = view;
}

/*------------- AXONOMETRIC ------------------*/

function axonometric(view) {
    var gama, theta, alpha, beta;
    var validOptions = false;
    switch (view) {
        case ('free'):
            validOptions = true;
            gama = axonometricFreeGamma;
            theta = axonometricFreeTheta;
            break;
        case ('isometry'):
            alpha = radians(30.0);
            beta = radians(30.0);
            break;
        case ('dimetry'):
            alpha = radians(42.0);
            beta = radians(7.0);
            break;
        case ('trimetry'):
            alpha = radians(54.16);
            beta = radians(23.16);
            break;
    }
    if (view != 'free') {
        var gama = getGama(alpha, beta); 
        var theta = getTheta(alpha, beta);
    }
    orthogonal('main', false);
    mView = mult(mView, mult(rotateX(gama) , rotateY(theta)));
    changeAxonometricFreeValue('gamma', gama);
    changeAxonometricFreeValue('theta', theta);
    enableDisableFreeOptions('axonometricFreeOptions', validOptions);
    lastViewAxonometric = view;
}

function changeAxonometricFreeValue(option, value) {
    switch (option) {
        case ('gamma'):
            axonometricFreeGamma = value;
            document.getElementById("axonometricFreeGamma").innerHTML = value;
            document.getElementById("axonometricFreeOptionsGamma").value = value;
            break;
        case ('theta'):
            axonometricFreeTheta = value;
            document.getElementById("axonometricFreeTheta").innerHTML = value;
            document.getElementById("axonometricFreeOptionsTheta").value = value;
            break;
    }
}

function degrees(angle) {
    return angle * 180.0/Math.PI;
}

function getTheta(alpha, beta) {
    return degrees( Math.atan( Math.sqrt( Math.tan(alpha) / Math.tan(beta) ) ) - Math.PI/2 );
}

function getGama(alpha, beta) {
    return degrees( Math.asin( Math.sqrt( Math.tan(alpha) * Math.tan(beta) ) ) );
}

/*------------- OBLIQUE ------------------*/

function oblique(view) {
    var l, alpha;
    var validOptions = false;
    switch (view) {
        case ('free'):
            validOptions = true;
            l = obliqueFreeL;
            alpha = radians(obliqueFreeAlpha);
            break;
        case ('knight'):
            l = 1;
            break;
        case ('cabinet'):
            l = 0.5;
            break;
    }
    if (view != 'free')
        alpha = radians(45.0);
    var matrix = mat4();
    matrix[0][2] = -l * Math.cos(alpha);
    matrix[1][2] = -l * Math.sin(alpha);
    orthogonal('main', false);
    mView = mult(mView, matrix);
    enableDisableFreeOptions('obliqueFreeOptions', validOptions);
    changeObliqueFreeValue('l', l);
    changeObliqueFreeValue('alpha', degrees(alpha));
    lastViewOblique = view;
}

// Change current oblique free values
function changeObliqueFreeValue(option, value) {
    switch (option) {
        case ('l'):
            obliqueFreeL = value;
            document.getElementById("obliqueFreeL").innerHTML = value;
            document.getElementById("obliqueFreeOptionsL").value = value;
            break;
        case ('alpha'):
            obliqueFreeAlpha = value;
            document.getElementById("obliqueFreeAlpha").innerHTML = value;
            document.getElementById("obliqueFreeOptionsAlpha").value = value;
            break;
    }
}

/*------------- PERSPECTIVE ------------------*/

function perspectiveOption() {
    orthogonal('main', false);
    var matrix = mat4();
    matrix[2][2] = 0;
    matrix[3][2] = -1/perspectiveFreeD;
    mView = mult(mView, matrix);
}

// Change current perspective free values
function changePerspectiveFreeValue(option, value) {
    switch (option) {
        case ('d'):
            perspectiveFreeD = value;
            document.getElementById("perspectiveFreeD").innerHTML = value;
            document.getElementById("perspectiveFreeOptionsD").value = value;
            break;
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(mModelLocation, false, flatten(object.m));
    gl.uniformMatrix4fv(mViewLocation, false, flatten(mView));
    gl.uniformMatrix4fv(mProjectionLocation, false, flatten(mProjection));
    
    object.d(gl, program, filled, superquadricFreeE1, superquadricFreeE2);

    window.requestAnimFrame(render);
}
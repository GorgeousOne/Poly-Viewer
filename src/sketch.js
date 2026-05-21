import p5 from 'p5'
import { polyData } from './main.js'

const holder = document.querySelector('#sketch-holder')

window.sketchAPI = {};
new p5((p) => {
	let t = 0;
	let loadedModels = {};
	let currentModel = 'Icosahedron';

	const loadOpts = {
		// Enables standardized size scaling during loading if set to true.
		normalize: true,
		// successCallback: handleModel,
		// failureCallback: handleError,
		fileType: '.obj',
	}

	p.setup = () => {
		p.createCanvas(holder.clientWidth, holder.clientHeight, p.WEBGL)
		p.noStroke();
		p.colorMode(p.HSB, 255);

		polyData.forEach(d => loadPoly(d.url, d.name));
	}

	p.draw = () => {
		// console.log(p._renderer.mainCamera.eyeZ);
		p.background(10)
		p.orbitControl(1, 1, 1, {freeRotation: true});
		p.scale(2.5);
		placeLights();
		
		p.specularMaterial(10);
		p.shininess(10)

		if (currentModel in loadedModels) {
			const model = loadedModels[currentModel]
			p.fill(model.paint);
			p.model(model.shape);
		} else {
			const dotty = 50;
			p.translate(-5 * dotty, 0, 0);
			p.sphere(dotty);
			p.translate(5 * dotty, 0, 0);
			p.sphere(dotty);
			p.translate(5 * dotty, 0, 0);
			p.sphere(dotty);
		}
	}

	p.windowResized = () => {
		p.resizeCanvas(holder.clientWidth, holder.clientHeight)
	}

	let lastHue = 42;
	const goldenAngle = 2 / (1 + p.sqrt(5)) * 255;

	function rngHsb() {
		lastHue = (lastHue + goldenAngle) % 255;
		return p.color(lastHue, 0.8*255, 0.8*255);
	}

	function placeLights() {
		let cam = p._renderer.mainCamera;

		// camera forward (view direction)
		let forward = p.createVector(
			cam.centerX - cam.eyeX,
			cam.centerY - cam.eyeY,
			cam.centerZ - cam.eyeZ
		);
		const focusDist = forward.mag();
		forward.normalize();

		// camera up
		let up = p.createVector(
			cam.upX,
			cam.upY,
			cam.upZ
		).normalize();

		// camera right
		let right = forward.cross(up).normalize();
		up = forward.cross(right);

		// directional light:
		// facing forward + downward 45°
		let lightDir = p5.Vector
			.add(forward, up.copy().mult(-0.5))
			.normalize();
		
		p.ambientLight(96);
		p.directionalLight(
			255, 0, 255,
			lightDir.x,
			lightDir.y,
			lightDir.z
		);

		let pointPos = p.createVector(
			cam.eyeX,
			cam.eyeY,
			cam.eyeZ
		).add(
			up.copy().mult(focusDist)
		);
	}

	async function loadPoly(url, modelKey) {
		console.log('loading... ', modelKey);
		const paint = rngHsb();
		const poly = await p.loadModel(url, true);
		// could also put the fuller file path in button dataset for uniqueness
		loadedModels[modelKey] = {shape: poly, paint: paint};
	}

	function displayPoly(name) {
		currentModel = name;
	}

	window.sketchAPI = {
		displayPoly: displayPoly,
	}
}, holder)
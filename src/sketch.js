import p5 from 'p5'
import { polyData } from './main.js'

const p5Holder = document.querySelector('#sketch-holder');
const polyLabel = document.querySelector('#poly-label');
const polyFaceList = document.querySelector('#poly-face-list');
const dualCheck = document.querySelector('#dual-check');

window.sketchAPI = {};

const polygonNames = {
	3: 'triangles',
	4: 'squares',
	5: 'pentagons',
	6: 'hexagons',
	8: 'octagons',
	10: 'decagons'
}

new p5((p) => {
	let t = 0;
	let loadedModels = {};
	let currentModel = '';

	const loadOpts = {
		// Enables standardized size scaling during loading if set to true.
		normalize: true,
		// successCallback: handleModel,
		// failureCallback: handleError,
		fileType: '.obj',
	}

	p.setup = () => {
		p.createCanvas(p5Holder.clientWidth, p5Holder.clientHeight, p.WEBGL)
		p.noStroke();
		p.colorMode(p.HSB, 255);

		polyData.forEach(d => loadPoly(d.url, d.name));
		// limit zoom factor to 0.5x-2.0x weirdly
		p._renderer.mainCamera.cameraNear = 400;
		p._renderer.mainCamera.cameraFar = 1600;
	}

	p.draw = () => {
		p.background(10)
		p.orbitControl(1, 1, 1, { freeRotation: true });
		p.scale(2.5);
		placeLights();

		p.specularMaterial(10);
		p.shininess(10);

		if (currentModel in loadedModels) {
			const model = loadedModels[currentModel]
			p.fill(model.paint);
			p.model(model.shape);
		} else {
			const dotty = 10;
			p.translate(-5 * dotty, 0, 0);
			p.sphere(dotty);
			p.translate(5 * dotty, 0, 0);
			p.sphere(dotty);
			p.translate(5 * dotty, 0, 0);
			p.sphere(dotty);
		}
	}

	p.windowResized = () => {
		p.resizeCanvas(p5Holder.clientWidth, p5Holder.clientHeight)
	}

	let lastHue = 42;
	const goldenAngle = 2 / (1 + p.sqrt(5)) * 255;

	function rngHsb() {
		lastHue = (lastHue + goldenAngle) % 255;
		return p.color(lastHue, 0.75 * 255, 0.9 * 255);
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
	}

	async function loadPoly(url, modelKey) {
		console.log('loading... ', modelKey);
		const paint = rngHsb();
		const poly = await p.loadModel(url);

		const [center, radius] = calcMeanBoundingSphere(poly);
		const targetScale = 100 / radius;
		normalizeModel(poly, center, targetScale);

		const faceCounts = [];
		// dont list faces of these fucked up models? xD
		// if (url.includes('platonic') || url.includes('archimedian') || url.includes('catalan')) {
			const txt = await fetch(url).then(r => r.text());
			for (const line of txt.split('\n')) {
				if (line.startsWith('f ')) {
					const faceSize = line.trim().split(/\s+/).slice(1).length;
					faceCounts[faceSize] = (faceCounts[faceSize] || 0) + 1;
				}
			}
		// }
		// could also put the fuller file path in button dataset for uniqueness
		loadedModels[modelKey] = { shape: poly, paint: paint, faceCounts: faceCounts };
	}

	function displayPoly(name) {
		currentModel = name;
		polyLabel.textContent = name;
		polyFaceList.textContent = "lot of faces :)";

		if (currentModel in loadedModels) {
			const faceCounts = loadedModels[currentModel].faceCounts;
			polyFaceList.textContent = Object.entries(faceCounts)
				.sort((a, b) => Number(a[0]) - Number(b[0]))
				.map(([size, count]) => `${count} ${polygonNames[size]}`)
				.join(', ');
		}
	}

	function calcMeanBoundingSphere(model) {
		// compute mean center
		const center = p.createVector(0, 0, 0);

		for (let i = 0; i < model.vertices.length; i++) {
			center.add(model.vertices[i]);
		}
		center.div(model.vertices.length);

		// find bounding radius
		let maxDist = 0;

		for (let i = 0; i < model.vertices.length; i++) {
			const d = center.dist(model.vertices[i]);
			maxDist = Math.max(maxDist, d);
		}
		return  [center, maxDist];
	}

	function normalizeModel(model, center, scale) {
		for (let i = 0; i < model.vertices.length; i++) {
			model.vertices[i].sub(center);
			model.vertices[i].mult(scale);
		}	
	}

	window.sketchAPI = {
		displayPoly: displayPoly,
	}
}, p5Holder)
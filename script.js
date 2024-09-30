import { Line, Point } from './objects.js';
import { buildLorentzTransform, Transform } from './transform.js';
import { Vector } from './vector.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const staticFrame = new Transform();
const Data = {
	frame:  new Transform(),
	nav:    new Transform(),
	view:   new Transform(),
	cursor: new Vector(),
	mouse:  false ? new Vector() : null,
};
const color = {
	defPoint: '#fb0',
	activePoint: '#fff',
	background: '#223',
	grid: 'rgba(127, 255, 192, 0.1)',
	gridLabel: 'rgba(127, 255, 192, 0.5)',
	cursor: '#777',
	refLines: 'rgba(255, 192, 127, 0.1)',
	refLabels: 'rgba(255, 192, 127, 0.5)',
};

const gridTargetSize = 75;
const points = false ? [ new Point() ] : [];
const lines = false ? [ new Line() ] : [];
let activePoint = null;

const format = (val) => {
	const maxDecimals = 10;
	const formatted = Number(val.toPrecision(maxDecimals));
	if (Math.abs(formatted) < 1e-13) {
		return '0';
	}
	return formatted.toString();
};

const mouseVec = (e) => {
	return new Vector([ e.offsetX + 0.5, e.offsetY + 0.5 ]);
};

const drawCursor = ([ x, y ]) => {
	const r = 7;
	const f = 0.45;
	const min = r*(1 - f);
	const max = r*(1 + f);
	ctx.lineWidth = 1;
	ctx.strokeStyle = color.cursor;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI*2);
	ctx.moveTo(x - min, y);
	ctx.lineTo(x - max, y);
	ctx.moveTo(x + min, y);
	ctx.lineTo(x + max, y);
	ctx.moveTo(x, y - min);
	ctx.lineTo(x, y - max);
	ctx.moveTo(x, y + min);
	ctx.lineTo(x, y + max);
	ctx.stroke();
};

const to1Figure = (x) => {
	return Number(x.toPrecision(1));
};

const prevStep = (x, step) => {
	const excess = x < 0 ? x % step + step : x % step;
	return x - excess;
};

const calcLineMC = (x0, y0, x1, y1) => {
	const m = (y1 - y0) / (x1 - x0);
	const c = y0 - x0*m;
	return [ m, c ];
};

const drawGrid = () => {
	const top = 0.5;
	const left = 0.5;
	const bottom = canvas.height - 0.5;
	const right = canvas.width - 0.5;

	const ref = Data.cursor.apply(Data.frame);
	const mat = Data.nav.apply(Data.view);
	const inv = mat.invert().translate(ref.mul(-1));
	const [ x0, t0 ] = new Vector([ left, bottom ]).apply(inv);
	const [ x1, t1 ] = new Vector([ right, top ]).apply(inv);
	const timeStep = to1Figure((t1 - t0) * gridTargetSize / Math.abs(top - bottom));
	const distStep = to1Figure((x1 - x0) * gridTargetSize / Math.abs(left - right));

	ctx.strokeStyle = color.grid;
	ctx.fillStyle = color.gridLabel;
	ctx.textBaseline = 'bottom';
	ctx.font = '10px monospace';

	ctx.beginPath();
	const tIni = prevStep(t0, timeStep);
	const tEnd = prevStep(t1, timeStep) + timeStep;
	const [ tm, tc ] = calcLineMC(t0, bottom, t1, top);
	for (let t=tIni; t<=tEnd; t+=timeStep) {
		const y = t*tm + tc;
		ctx.moveTo(0, y);
		ctx.lineTo(canvas.width, y);
		ctx.fillText(format(t) + ' sec', 5, y - 5);
	}

	const xIni = prevStep(x0, distStep);
	const xEnd = prevStep(x1, distStep) + distStep;
	const [ xm, xc ] = calcLineMC(x0, left, x1, right);
	for (let d=xIni; d<=xEnd; d+=distStep) {
		const x = d*xm + xc;
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
	}
	ctx.stroke();
};

const drawMouseLines = () => {
	if (!Data.mouse) {
		return;
	}

	const [ x, y ] = Data.mouse;
	ctx.strokeStyle = color.refLines;

	const diag = Math.sqrt(canvas.width**2 + canvas.height**2);
	ctx.beginPath();
	ctx.moveTo(0, y);
	ctx.lineTo(canvas.width, y);
	ctx.moveTo(x, 0);
	ctx.lineTo(x, canvas.height);
	ctx.moveTo(x - diag, y - diag);
	ctx.lineTo(x + diag, y + diag);
	ctx.moveTo(x + diag, y - diag);
	ctx.lineTo(x - diag, y + diag);
	ctx.stroke();

	const ref = Data.cursor.apply(Data.frame);
	const vec = Data.mouse.apply(Data.nav.apply(Data.view).invert());
	const [ pos, time ] = vec.sub(ref);

	ctx.font = '14px monospace';
	ctx.fillStyle = color.refLabels;
	ctx.textAlign = 'right';
	ctx.textBaseline = 'bottom';
	ctx.fillText(format(time) + ' sec', canvas.width - 5, y - 5);
	
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText(format(pos) + ' ls', x + 5, 5);
};

const drawLines = (proj) => {
	for (let line of lines) {
		const { a, b } = line;
		const [ ax, ay ] = a.projected;
		const [ bx, by ] = b.projected;
		ctx.strokeStyle = a.color;
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
	}
};

const projectPoints = (proj) => {
	for (const point of points) {
		point.vec.apply(proj, point.projected);
	}
};

const drawPoints = () => {
	for (const point of points) {
		const [ x, y ] = point.projected;
		ctx.fillStyle = point == activePoint ? color.activePoint : point.color;
		ctx.beginPath();
		ctx.arc(x, y, 2.5, 0, Math.PI*2);
		ctx.fill();
	}
};

const render = () => {
	
	ctx.fillStyle = color.background;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	Data.view.set([ 7, 0, 0, -7, canvas.width * 0.5, canvas.height * 0.5 ]);
	const proj = Data.frame.apply(Data.nav).apply(Data.view);
	
	drawGrid();
	projectPoints(proj)
	drawPoints();
	drawLines();
	drawCursor(Data.cursor.apply(proj));
	drawMouseLines();
};

canvas.addEventListener('click', (e) => {
	const proj = Data.frame.apply(Data.nav).apply(Data.view);
	const point = new Point(mouseVec(e).apply(proj.invert()), color.defPoint);
	points.push(point);
	if (activePoint !== null && e.ctrlKey) {
		lines.push(new Line(activePoint, point));
	}
	activePoint = point;
	render();
});

canvas.addEventListener('mousedown', (e) => {
	if (e.button === 1) {
		const inv = new Transform()
			.apply(Data.frame)
			.apply(Data.nav)
			.apply(Data.view)
			.invert();
		Data.cursor = mouseVec(e).apply(inv);
		render();
	}
});

canvas.addEventListener('mousemove', (e) => {
	Data.mouse = mouseVec(e);
	render();
});

canvas.addEventListener('mouseout', (e) => {
	Data.mouse = null;
	render();
});

canvas.addEventListener('wheel', (e) => {
	const vec = mouseVec(e);
	const scale = 1 - e.deltaY * 0.001;
	const inv = Data.view.invert();
	const pos = vec.apply(inv);
	const mod = new Transform()
		.translate(pos.mul(-1))
		.scale(scale, scale)
		.translate(pos);
	Data.nav = Data.nav.apply(mod);
	render();
});

const range = document.querySelector('input');

const setLorentzFactor = (factor) => {
	let t = new Transform().set(staticFrame);
	const shift = Data.cursor.apply(staticFrame);
	t.translate(shift.mul(-1), t);
	t.apply(buildLorentzTransform(factor), t);
	t.translate(shift, t);
	Data.frame.set(t);
};

range.addEventListener('input', (e) => {
	setLorentzFactor(2 ** range.value);
	render();
});

range.addEventListener('change', (e) => {
	staticFrame.set(Data.frame);
	range.value = '0';
});

render();

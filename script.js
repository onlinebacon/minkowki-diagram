import { Line, Point } from './objects.js';
import { buildLorentzTransform, Transform } from './transform.js';
import { Vector } from './vector.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const Data = {
	static: new Transform(),
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
let autoAlignment = false;
let startClick = null;

// [ first, step ]
const xLines = [ 0, gridTargetSize ];
const yLines = [ 0, gridTargetSize ];

const minDist = 5;
const pointRadius = 2.5;

const format = (val) => {
	const maxDecimals = 10;
	const formatted = Number(val.toPrecision(maxDecimals));
	if (Math.abs(formatted) < 1e-13) {
		return '0';
	}
	return formatted.toString();
};

const roundToLine = (val, [ min, step ]) => {
	return min + Math.round((val - min) / step) * step;
};

const closestPointTo = (vec, except) => {
	let res = null;
	let minDist = Infinity;
	for (const point of points) {
		if (point === except) {
			continue;
		}
		const dist = point.projected.sub(vec).len();
		if (dist < minDist) {
			res = point;
			minDist = dist;
		}
	}
	return [ res, minDist ];
};

const pointThatIncludes = (vec, except) => {
	const [ res, dist ] = closestPointTo(vec, except);
	if (dist > minDist) return null;
	return res;
};

const mouseVec = (e) => {
	const x = e.offsetX + 0.5;
	const y = e.offsetY + 0.5;
	const vec = new Vector([ x, y ]);
	if (!autoAlignment) {
		return vec;
	}
	const gridPoint = new Vector([
		roundToLine(x, xLines),
		roundToLine(y, yLines),
	]);
	const [ closestPoint ] = closestPointTo(vec);
	if (closestPoint === null) {
		return gridPoint;
	}
	if (gridPoint.sub(vec).len() < closestPoint.projected.sub(vec).len()) {
		return gridPoint;
	}
	return new Vector(closestPoint.projected);
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

	ctx.textBaseline = 'bottom';
	const xIni = prevStep(x0, distStep);
	const xEnd = prevStep(x1, distStep) + distStep;
	const [ xm, xc ] = calcLineMC(x0, left, x1, right);
	for (let d=xIni; d<=xEnd; d+=distStep) {
		const x = d*xm + xc;
		ctx.moveTo(x, 0);
		ctx.lineTo(x, canvas.height);
		ctx.fillText(format(d) + ' ls', x + 5, canvas.height - 5);
	}
	ctx.stroke();

	xLines[0] = Math.min(xEnd*xm + xc, xIni*xm + xc);
	xLines[1] = Math.abs(distStep*xm);

	yLines[0] = Math.min(tEnd*tm + tc, tIni*tm + tc);
	yLines[1] = Math.abs(timeStep*tm);
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

const drawLines = () => {
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
		ctx.arc(x, y, pointRadius, 0, Math.PI*2);
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
	drawLines();
	drawPoints();
	drawCursor(Data.cursor.apply(proj));
	drawMouseLines();
};

canvas.addEventListener('mousedown', (e) => {
	if (e.button === 1) {
		const proj = Data.frame.apply(Data.nav).apply(Data.view);
		const inv = proj.invert();
		Data.cursor.set(mouseVec(e).apply(inv));
		render();
		return;
	}
	if (e.button !== 0) {
		return;
	}
	const mouse = mouseVec(e);
	Data.mouse.set(mouse);
	const [ clickedPoint, distance ] = closestPointTo(mouse);
	startClick = {
		mouse,
		clickedPoint: distance <= pointRadius ? clickedPoint : null,
		moved: false,
		line: null,
		newPoint: null,
		ctrl: e.ctrlKey,
	};
	render();
});

const handleClickEnd = () => {
	const { line } = startClick;
	if (line !== null) {
		const { b } = line;
		const mergeWith = pointThatIncludes(b.projected, b);
		if (mergeWith !== null) {
			arrayRemove(points, b);
			line.b = mergeWith;
			render();
		}
	}
	startClick = null;
};

canvas.addEventListener('click', (e) => {
	if (e.button !== 0) {
		return;
	}
	if (startClick !== null) {
		if (startClick.moved) {
			handleClickEnd();
			return;
		}
	}
	const vec = mouseVec(e);
	let point = pointThatIncludes(vec);
	if (activePoint && e.ctrlKey) {
		if (!point) {
			const proj = Data.frame.apply(Data.nav).apply(Data.view);
			point = new Point(vec.apply(proj.invert()), color.defPoint);
		}
		points.push(point);
		const line = new Line(activePoint, point);
		lines.push(line);
		return;
	}
	activePoint = point;
	render();
});

canvas.addEventListener('mousemove', (e) => {
	Data.mouse = mouseVec(e);

	if (startClick !== null && (e.buttons & 1) === 0) {
		handleClickEnd();
	}

	if (startClick !== null) {
		const proj = Data.frame.apply(Data.nav).apply(Data.view);
		const inv = proj.invert();
		
		if (!startClick.moved) {
			const dist = startClick.mouse.sub(Data.mouse).len();
			if (dist >= minDist) {
				startClick.moved = true;

				let a = pointThatIncludes(startClick.mouse);
				if (a === null) {
					const point = new Point(startClick.mouse.apply(inv), color.defPoint);
					points.push(point);
					a = point;
				}

				const b = new Point(Data.mouse.apply(inv), color.defPoint);
				startClick.newPoint = b;
				points.push(b);
				activePoint = b;

				const line = new Line(a, b);
				lines.push(line);
				startClick.line = line;
			}
		}
		
		if (startClick.line !== null) {
			const val = Data.mouse.apply(inv);
			startClick.line.b.vec.set(val);
		}
	}
	render();
});

window.points = points;

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
	let t = new Transform().set(Data.static);
	const shift = Data.cursor.apply(Data.static);
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
	Data.static.set(Data.frame);
	range.value = '0';
});

const arrayRemove = (arr, item) => {
	const index = arr.indexOf(item);
	if (index === -1) {
		return false;
	}
	arr.splice(index, 1);
	return true;
};

window.addEventListener('keydown', (e) => {
	if (e.code === 'Delete' && activePoint) {
		arrayRemove(points, activePoint);
		const deleteLines = lines.filter((line) => {
			if (line.a === activePoint) return true;
			if (line.b === activePoint) return true;
			return false;
		});
		for (const line of deleteLines) {
			arrayRemove(lines, line);
		}
		render();
	}
	if (e.code === 'ControlLeft') {
		autoAlignment = true;
		render();
	}
});

window.addEventListener('keyup', (e) => {
	if (e.code === 'ControlLeft') {
		autoAlignment = false;
		render();
	}
});

render();

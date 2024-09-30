const clear = (t) => {
	for (let i=0; i<6; ++i) {
		t[i] = +!(i % 3);
	}
};

const horizontalShear = (t, val) => {
	t[0] += t[1]*val;
	t[2] += t[3]*val;
	t[4] += t[5]*val;
};

const scale = (t, sx, sy) => {
	t[0] *= sx;
	t[1] *= sy;
	t[2] *= sx;
	t[3] *= sy;
	t[4] *= sx;
	t[5] *= sy;
};

const tilt = (t, sin, cos) => {
	const [ ix, iy, jx, jy, kx, ky ] = t;
	t[0] = ix*cos - iy*sin;
	t[1] = iy*cos + ix*sin;
	t[2] = jx*cos - jy*sin;
	t[3] = jy*cos + jx*sin;
	t[4] = kx*cos - ky*sin;
	t[5] = ky*cos + kx*sin;
};

const invert = (t, r) => {
	const [ ix, iy ] = t;
	const iLen = Math.sqrt(ix**2 + iy**2);
	const cos = ix/iLen;
	const sin = - iy/iLen;
	tilt(t, sin, cos);
	tilt(r, sin, cos);
	const [ _ix, _iy, jx, jy ] = t;
	const shear = - jx/jy;
	horizontalShear(t, shear);
	horizontalShear(r, shear);
	const sx = 1/t[0];
	const sy = 1/t[3];
	scale(t, sx, sy);
	scale(r, sx, sy);
	r[4] -= t[4];
	r[5] -= t[5];
	return r;
};

export class Transform extends Array {
	constructor(args) {
		super(6);
		if (args !== undefined) {
			this.set(args);
		} else {
			clear(this);
		}
	}
	clear() {
		clear(this);
		return this;
	}
	apply(t, res = new Transform()) {
		const [ aix, aiy, ajx, ajy, akx, aky ] = this;
		const [ bix, biy, bjx, bjy, bkx, bky ] = t;
		res[0] = aix*bix + aiy*bjx;
		res[1] = aix*biy + aiy*bjy;
		res[2] = ajx*bix + ajy*bjx;
		res[3] = ajx*biy + ajy*bjy;
		res[4] = akx*bix + aky*bjx + bkx;
		res[5] = akx*biy + aky*bjy + bky;
		return res;
	}
	translate([ x, y ], res = new Transform()) {
		const [ ix, iy, jx, jy, kx, ky ] = this;
		res[0] = ix;
		res[1] = iy;
		res[2] = jx;
		res[3] = jy;
		res[4] = kx + x;
		res[5] = ky + y;
		return res;
	}
	applyTo([ x, y ], res = new Array(2)) {
		const [ ix, iy, jx, jy, kx, ky ] = this;
		res[0] = x*ix + y*jx + kx;
		res[1] = x*iy + y*jy + ky;
		return res;
	}
	set(values) {
		for (let i=0; i<6; ++i) {
			this[i] = values[i];
		}
		return this;
	}
	scale(x, y, res = new Transform()) {
		const [ ix, iy, jx, jy, kx, ky ] = this;
		res[0] = ix*x;
		res[1] = iy*y;
		res[2] = jx*x;
		res[3] = jy*y;
		res[4] = kx*x;
		res[5] = ky*y;
		return res;
	}
	invert(res = new Transform()) {
		temp.set(this);
		clear(res);
		invert(temp, res);
		return res;
	}
}

export const buildLorentzTransform = (f) => {
	const c = Math.SQRT1_2;
	const t = new Transform();
	t.apply([ c, -c,  c,   c, 0, 0 ], t);
	t.apply([ f,  0,  0, 1/f, 0, 0 ], t);
	t.apply([ c,  c, -c,   c, 0, 0 ], t);
	return t;
};

const temp = new Transform();

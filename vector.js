export class Vector extends Array {
	constructor(args) {
		super(2);
		if (args !== undefined) {
			this.set(args);
		} else {
			this[0] = 0;
			this[1] = 0;
		}
	}
	apply(transform, res = new Vector()) {
		transform.applyTo(this, res);
		return res;
	}
	set([ x, y ]) {
		this[0] = x;
		this[1] = y;
		return this;
	}
	add([ bx, by ], res = new Vector()) {
		const [ ax, ay ] = this;
		res[0] = ax + bx;
		res[1] = ay + by;
		return res;
	}
	sub([ bx, by ], res = new Vector()) {
		const [ ax, ay ] = this;
		res[0] = ax - bx;
		res[1] = ay - by;
		return res;
	}
	mul(val, res = new Vector()) {
		const [ x, y ] = this;
		res[0] = x * val;
		res[1] = y * val;
		return res;
	}
	div(val, res = new Vector()) {
		const [ x, y ] = this;
		res[0] = x / val;
		res[1] = y / val;
		return res;
	}
	len() {
		const [ x, y ] = this;
		return Math.sqrt(x**2 + y**2);
	}
	normal(res = new Vector()) {
		this.div(this.len(), res);
		return res;
	}
}

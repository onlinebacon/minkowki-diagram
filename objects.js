import { Vector } from './vector.js';

export class Point {
	constructor(vec = new Vector(), color = '#777') {
		this.vec = vec;
		this.color = color;
		this.projected = new Vector();
	}
}

export class Line {
	constructor(a = new Point(), b = new Point(), color = '#777') {
		this.a = a;
		this.b = b;
		this.color = color;
	}
}

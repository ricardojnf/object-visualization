var superquadric_points = [];
var superquadric_normals = [];
var superquadric_faces = [];
var superquadric_edges = [];

var superquadric_points_buffer;
var superquadric_normals_buffer;
var superquadric_faces_buffer;
var superquadric_edges_buffer;

var superquadric_LATS=20;
var superquadric_LONS=30;

var e1 = 3, e2 = 3;

function superquadricInit(gl, nlat, nlon) {
    superquadric_points = [];
    superquadric_normals = [];
    superquadric_faces = [];
    superquadric_edges = [];

    nlat = nlat | superquadric_LATS;
    nlon = nlon | superquadric_LONS;
    superquadricBuild(nlat, nlon);
    superquadricUploadData(gl);
}

function exp(base, exponent) {
    return Math.sign(base) * Math.pow(Math.abs(base), exponent);
}

// Generate points using polar coordinates
function superquadricBuild(nlat, nlon) 
{
    // phi will be latitude
    // theta will be longitude
 
    var d_phi = Math.PI / (nlat+1);
    var d_theta = 2*Math.PI / nlon;
    var r = 0.5;
    
    // Generate north polar cap
    var north = vec3(0,r,0);
    superquadric_points.push(north);
    superquadric_normals.push(vec3(0,1,0));
    
    // Generate middle
    for(var i=0, phi=Math.PI/2-d_phi; i<nlat; i++, phi-=d_phi) {
        for(var j=0, theta=0; j<nlon; j++, theta+=d_theta) {
            //var pt = vec3(r*Math.cos(phi)*Math.cos(theta),r*Math.sin(phi),r*Math.cos(phi)*Math.sin(theta));
            var pt_x = r * exp(Math.cos(phi), e1) * exp(Math.cos(theta), e2);
            var pt_y = r * exp(Math.sin(phi), e1);
            var pt_z = r * exp(Math.cos(phi), e1) * exp(Math.sin(theta), e2);
            var pt = vec3(pt_x, pt_y, pt_z);
            superquadric_points.push(pt);
            var n = vec3(pt);
            superquadric_normals.push(normalize(n));
        }
    }
    
    // Generate norh south cap
    var south = vec3(0,-r,0);
    superquadric_points.push(south);
    superquadric_normals.push(vec3(0,-1,0));
    
    // Generate the faces
    
    // north pole faces
    for(var i=0; i<nlon-1; i++) {
        superquadric_faces.push(0);
        superquadric_faces.push(i+2);
        superquadric_faces.push(i+1);
    }
    superquadric_faces.push(0);
    superquadric_faces.push(1);
    superquadric_faces.push(nlon);
    
    // general middle faces
    var offset=1;
    
    for(var i=0; i<nlat-1; i++) {
        for(var j=0; j<nlon-1; j++) {
            var p = offset+i*nlon+j;
            superquadric_faces.push(p);
            superquadric_faces.push(p+nlon+1);
            superquadric_faces.push(p+nlon);
            
            superquadric_faces.push(p);
            superquadric_faces.push(p+1);
            superquadric_faces.push(p+nlon+1);
        }
        var p = offset+i*nlon+nlon-1;
        superquadric_faces.push(p);
        superquadric_faces.push(p+1);
        superquadric_faces.push(p+nlon);

        superquadric_faces.push(p);
        superquadric_faces.push(p-nlon+1);
        superquadric_faces.push(p+1);
    }
    
    // south pole faces
    var offset = 1 + (nlat-1) * nlon;
    for(var j=0; j<nlon-1; j++) {
        superquadric_faces.push(offset+nlon);
        superquadric_faces.push(offset+j);
        superquadric_faces.push(offset+j+1);
    }
    superquadric_faces.push(offset+nlon);
    superquadric_faces.push(offset+nlon-1);
    superquadric_faces.push(offset);
 
    // Build the edges
    for(var i=0; i<nlon; i++) {
        superquadric_edges.push(0);   // North pole 
        superquadric_edges.push(i+1);
    }

    for(var i=0; i<nlat; i++, p++) {
        for(var j=0; j<nlon;j++, p++) {
            var p = 1 + i*nlon + j;
            superquadric_edges.push(p);   // horizontal line (same latitude)
            if(j!=nlon-1) 
                superquadric_edges.push(p+1);
            else superquadric_edges.push(p+1-nlon);
            
            if(i!=nlat-1) {
                superquadric_edges.push(p);   // vertical line (same longitude)
                superquadric_edges.push(p+nlon);
            }
            else {
                superquadric_edges.push(p);
                superquadric_edges.push(superquadric_points.length-1);
            }
        }
    }
    
}

function superquadricUploadData(gl)
{
    superquadric_points_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, superquadric_points_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(superquadric_points), gl.STATIC_DRAW);
    
    superquadric_normals_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, superquadric_normals_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(superquadric_normals), gl.STATIC_DRAW);
    
    superquadric_faces_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, superquadric_faces_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(superquadric_faces), gl.STATIC_DRAW);
    
    superquadric_edges_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, superquadric_edges_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(superquadric_edges), gl.STATIC_DRAW);
}

function superquadricDrawWireFrame(gl, program)
{    
    gl.useProgram(program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, superquadric_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, superquadric_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, superquadric_edges_buffer);
    gl.drawElements(gl.LINES, superquadric_edges.length, gl.UNSIGNED_SHORT, 0);
}

function superquadricDrawFilled(gl, program)
{
    gl.useProgram(program);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, superquadric_points_buffer);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, superquadric_normals_buffer);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, superquadric_faces_buffer);
    gl.drawElements(gl.TRIANGLES, superquadric_faces.length, gl.UNSIGNED_SHORT, 0);
}

function superquadricDraw(gl, program, filled=false, newE1, newE2) {
    e1 = newE1;
    e2 = newE2;
    superquadricInit(gl);
	if(filled) superquadricDrawFilled(gl, program);
    else superquadricDrawWireFrame(gl, program);
}
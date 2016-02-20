from geventwebsocket.handler import WebSocketHandler
from gevent.pywsgi import WSGIServer
from twidder import app
http_server = WSGIServer(('',5000), app, handler_class=WebSocketHandler)
http_server.serve_forever()

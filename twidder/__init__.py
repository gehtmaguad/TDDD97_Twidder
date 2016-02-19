from flask import Flask

app = Flask(__name__, static_url_path='')
app.debug = True

import twidder.views

"""
Compatibility shim for editable installs.
setuptools needs this for `pip install -e .` to work with package_dir mapping.
"""
from setuptools import setup
setup()

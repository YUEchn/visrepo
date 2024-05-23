import zipfile
import json
import esprima
from difflib import SequenceMatcher

exclude_folders = ['.git', 'node_modules', 'libs', 'lib']
variable_files = ['js', 'jsx', 'ts', 'tsx']

# 两个词之间的相似性的比较
def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def extract_names_from_esprima_ast(data):
    function_declarations = []
    variable_declarations = []

    def extract_declarations(node, function_declarations, variable_declarations):
        if isinstance(node, dict):
            if "type" in node:
                if node["type"] == "FunctionDeclaration":
                    function_declarations.append(node['id'].name)
                elif node["type"] == "VariableDeclaration":
                    declarations = node['declarations']
                    for declaration in declarations:
                        if declaration.type == 'VariableDeclarator':
                            variable_declarations.append(declaration.id.name)

            for key, value in node.items():
                if isinstance(value, (str, list)):
                    extract_declarations(value, function_declarations, variable_declarations)
                elif hasattr(value, '__dict__'):
                    # print(type(value), value)
                    extract_declarations(vars(value), function_declarations, variable_declarations)
                else:
                    extract_declarations(value, function_declarations, variable_declarations)

        elif isinstance(node, list):
            for item in node:
                extract_declarations(vars(item), function_declarations, variable_declarations)

    extract_declarations(data, function_declarations, variable_declarations)

    return function_declarations, variable_declarations


class SourceCodeAnalyzer:
    def __init__(self, zip_file_path):
        self.zip_file_path = zip_file_path
        self.file_structure = {}
        self.name = {}

    def analyze(self):
        print(self.zip_file_path)
        with zipfile.ZipFile(self.zip_file_path, 'r') as zip_ref:
            for file_info in zip_ref.infolist():
                file_path = file_info.filename

                should_added = True  # 是否应该获取当前文件的数据
                for folder in exclude_folders:
                    if file_path.find(folder.lower()) != -1:
                        should_added = False
                        break

                if should_added:
                    self._update_file_structure(file_path, file_info, zip_ref)

    def _update_file_structure(self, file_path, file_info, zip_ref):
        if not file_info.is_dir():
            file_extension = file_path.split('.')[-1].lower()
            if file_extension in variable_files:
                encodings = ['utf-8', 'gbk', 'latin-1']  # 按照可能的编码方式顺序进行尝试
                content = None
                for encoding in encodings:
                    try:
                        content = zip_ref.read(file_path).decode(encoding)  # 不是目录，直接读取文件内容并获取变量
                        break
                    except UnicodeDecodeError:
                        continue
                if content is not None:
                    # content = content.encode()
                    try:
                        ast = esprima.parse(content)
                        function_names, variable_names = extract_names_from_esprima_ast(vars(ast))
                        self.name[file_path.split('/', 1)[1]] = {}  # 不包含根路径
                        self.name[file_path.split('/', 1)[1]]['function_names'] = function_names
                        self.name[file_path.split('/', 1)[1]]['variable_names'] = variable_names
                    except Exception as e:
                        print(str(e), file_path, '-error')
              
    # 相似性阈值默认为0，即不进行合并，相似性计算非常耗时，暂时不计算
    def calWordsFreny(self, similarity_threshold, shouldCal = False):
        functions = []
        vars = []
        result = {}
        if not shouldCal:  # 默认不计算相似性
            for file_path, values in self.name.items():
                function_names = values["function_names"]
                variables_names = values["variable_names"]

                for name in function_names:
                    
                    existing_entry = next((entry for entry in functions if entry["name"] == name), None)
                    if existing_entry:
                        # existing_entry["merge"].append(file_path)
                        existing_entry["filDir"].append(file_path)
                        existing_entry["value"] += 1  # 文件中包含这个名称，因此递增值
                    else:
                        functions.append({
                            "name": name,
                            "filDir": [file_path],
                            # "merge": [file_path],
                            # "type": 'function',
                            "value": 1  # 初始化为1，因为当前文件已经包含了这个名称
                        })

                for name in variables_names:
                    existing_entry = next((entry for entry in vars if entry["name"] == name), None)
                    if existing_entry:
                        # existing_entry["merge"].append(file_path)
                        existing_entry["filDir"].append(file_path)
                        existing_entry["value"] += 1  # 文件中包含这个名称，因此递增值
                    else:
                        vars.append({
                            "name": name,
                            # "merge": [file_path],
                            "filDir": [file_path],
                            # "type": 'variable',
                            "value": 1  # 初始化为1，因为当前文件已经包含了这个名称
                        })
            return {"function": functions, "var": vars}
                    
        # 下面是基于相似性进行合并的，不合并了
        for file_path, file_data in self.name.items():
            for function_name in file_data['function_names']:
                found_similar = False
                for key, value in result.items():
                    if similar(function_name, key) > similarity_threshold:
                        found_similar = True
                        value['files'].append(file_path)
                        value['merge'].append(function_name)
                        value['value'] += 1
                        break
                if not found_similar:
                    result[function_name] = {
                        'value': 1,
                        'text': function_name,
                        'files': [file_path],
                        'type': 'function',
                        'merge': []
                    }
                    
            for variable_name in file_data['variable_names']:
                found_similar = False
                for key, value in result.items():
                    if similar(variable_name, key) > similarity_threshold:
                        found_similar = True
                        value['files'].append(file_path)
                        value['merge'].append(variable_name)
                        value['value'] += 1
                        break
                if not found_similar:
                    result[variable_name] = {
                        'value': 1,
                        'text': variable_name,
                        'files': [file_path],
                        'type': 'variable',
                        'merge': []
                    }
        return result

import re
path = "/Users/yukeshmaharjan/Documents/SquadFronted/src/pages/Client/Client.tsx"
with open(path, "r") as f:
    content = f.read()

# Add import
import_statement = 'import { SenderIdTranslationModal } from "../../components/modals/SenderIdTranslationModal";'
if "SenderIdTranslationModal" not in content[:content.find("export const")]:
    idx = content.find('import { SenderIdPolicyModal }')
    if idx != -1:
        content = content[:idx] + import_statement + "\n" + content[idx:]
        
# Add state
state_statement = '  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);\n  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);'
if "isTranslationModalOpen" not in content[:content.find("return")]:
    idx = content.find('const [isSenderPolicyModalOpen, setIsSenderPolicyModalOpen]')
    if idx != -1:
        end_idx = content.find('\n', idx)
        content = content[:end_idx+1] + state_statement + "\n" + content[end_idx+1:]
        
# Add to dropdown options
dropdown_statement = """            {
              label: "Sender ID Translation (Phase 2)",
              onClick: () => {
                setSelectedClientId(client.id);
                setIsTranslationModalOpen(true);
              },
            },"""
if "Sender ID Translation (Phase 2)" not in content:
    idx = content.find('label: "Sender ID Authorization (Phase 1)",')
    if idx != -1:
        # find the end of the object
        end_obj_idx = content.find('},', idx) + 2
        content = content[:end_obj_idx] + "\n" + dropdown_statement + content[end_obj_idx:]

with open(path, "w") as f:
    f.write(content)
print("Patched Client.tsx")

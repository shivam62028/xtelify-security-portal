import re

with open("src/App.tsx", "r") as f:
    content = f.read()

# generateAIRemediation block
orig_gen = """          } catch (err: any) {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            console.error(err);
            alert(err.message || "Error fetching AI remediation status.");
            setIsGeneratingAI(prev => ({ ...prev, [rowKey]: false }));
          }"""
new_gen = """          } catch (err: any) {
            return;
          }"""
content = content.replace(orig_gen, new_gen)

# handleGenerateAiRemediation block
orig_handle = """          } catch (err: any) {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
            setAiError(prev => ({ ...prev, [id]: err.message || 'Unable to fetch AI remediation status.' }));
            setIsAiGenerating(prev => ({ ...prev, [id]: false }));
          }"""
new_handle = """          } catch (err: any) {
            return;
          }"""
content = content.replace(orig_handle, new_handle)

with open("src/App.tsx", "w") as f:
    f.write(content)
